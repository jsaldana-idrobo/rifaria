import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createEmailProviderOptions,
  sendEmailWithProvider,
  type SendEmailInput
} from '@rifaria/shared';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async send(input: SendEmailInput): Promise<void> {
    await sendEmailWithProvider(
      createEmailProviderOptions(this.configService, this.logger, fetch),
      input
    );
  }
}
