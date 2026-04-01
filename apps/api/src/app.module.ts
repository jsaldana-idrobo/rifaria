import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { loadEnv } from './config/env';
import { shouldEnableNotificationQueue } from './config/notifications-mode';
import { AppBootstrapService } from './app-bootstrap.service';
import { AdminModule } from './modules/admin/admin.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { DrawsModule } from './modules/draws/draws.module';
import { HealthModule } from './modules/health/health.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsWompiModule } from './modules/payments-wompi/payments-wompi.module';
import { RafflesModule } from './modules/raffles/raffles.module';
import { TicketsModule } from './modules/tickets/tickets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: (source) => loadEnv(source as NodeJS.ProcessEnv)
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI', 'mongodb://localhost:27017/rifaria'),
        lazyConnection: true,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      })
    }),
    ...(shouldEnableNotificationQueue()
      ? [
          BullModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
              connection: (() => {
                const password = configService.get<string>('REDIS_PASSWORD');

                return {
                  host: configService.get<string>('REDIS_HOST', '127.0.0.1'),
                  port: configService.get<number>('REDIS_PORT', 6379),
                  lazyConnect: true,
                  enableReadyCheck: false,
                  maxRetriesPerRequest: null,
                  ...(password ? { password } : {})
                };
              })()
            })
          })
        ]
      : []),
    HealthModule,
    MaintenanceModule,
    RafflesModule,
    TicketsModule,
    OrdersModule,
    PaymentsWompiModule,
    NotificationsModule,
    AuditModule,
    AuthModule,
    AdminModule,
    DrawsModule
  ],
  providers: [AppBootstrapService]
})
export class AppModule {}
