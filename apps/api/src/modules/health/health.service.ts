import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import Redis from 'ioredis';
import { Connection } from 'mongoose';

type CheckStatus = 'up' | 'down';

export interface ReadinessReport {
  status: 'ok' | 'degraded';
  timestamp: string;
  checks: {
    mongodb: CheckStatus;
    redis: CheckStatus;
  };
}

@Injectable()
export class HealthService implements OnModuleDestroy {
  private redisClient: Redis | null = null;

  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly configService: ConfigService
  ) {}

  getLiveness(): { status: 'ok'; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  }

  async getReadiness(): Promise<ReadinessReport> {
    const mongodb = (await this.pingMongo()) ? 'up' : 'down';
    const redis = (await this.pingRedis()) ? 'up' : 'down';
    const status = mongodb === 'up' && redis === 'up' ? 'ok' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        mongodb,
        redis
      }
    };
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch {
        this.redisClient.disconnect();
      }
      this.redisClient = null;
    }
  }

  private async pingMongo(): Promise<boolean> {
    try {
      let connectionPromise: Promise<Connection>;
      if (this.mongoConnection.readyState === 1) {
        connectionPromise = Promise.resolve(this.mongoConnection);
      } else if (this.mongoConnection.readyState === 2) {
        connectionPromise = this.mongoConnection.asPromise();
      } else {
        connectionPromise = this.mongoConnection.openUri(
          this.configService.get<string>('MONGODB_URI', 'mongodb://localhost:27017/rifaria'),
          {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000
          }
        );
      }

      const connection = await Promise.race([
        connectionPromise,
        new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 3000))
      ]);

      if (connection === 'timeout' || !connection.db) {
        return false;
      }

      const pong = await Promise.race([
        connection.db.admin().ping(),
        new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 1000))
      ]);

      return pong !== 'timeout';
    } catch {
      return false;
    }
  }

  private async pingRedis(): Promise<boolean> {
    const client = this.getRedisClient();

    try {
      const pong = await Promise.race([
        client.ping(),
        new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 1000))
      ]);

      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  private getRedisClient(): Redis {
    if (this.redisClient) {
      return this.redisClient;
    }

    const password = this.configService.get<string>('REDIS_PASSWORD');
    this.redisClient = new Redis({
      host: this.configService.get<string>('REDIS_HOST', '127.0.0.1'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableReadyCheck: false,
      ...(password ? { password } : {})
    });

    return this.redisClient;
  }
}
