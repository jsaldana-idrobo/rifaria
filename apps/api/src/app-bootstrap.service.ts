import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RafflesService } from './modules/raffles/raffles.service';

@Injectable()
export class AppBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AppBootstrapService.name);

  constructor(
    private readonly rafflesService: RafflesService,
    private readonly configService: ConfigService
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      this.logger.log('Skipping bootstrap raffle seed in production');
      return;
    }

    const raffle = await this.rafflesService.createDraftIfNoneExists();
    this.logger.log(`Bootstrap raffle ready: ${raffle.slug}`);
  }
}
