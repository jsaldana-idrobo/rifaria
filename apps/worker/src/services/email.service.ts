import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async send(input: SendEmailInput): Promise<void> {
    const provider = this.configService.get<string>('EMAIL_PROVIDER', 'console');
    const from = this.configService.get<string>('EMAIL_FROM', 'Rifaria <no-reply@rifaria.local>');
    const replyTo = this.configService.get<string | undefined>('EMAIL_REPLY_TO');

    if (provider === 'console') {
      this.logger.log(`EMAIL(console) from=${from} to=${input.to} subject=${input.subject}`);
      this.logger.debug(input.html);
      return;
    }

    if (provider === 'resend') {
      await this.sendWithResend({
        from,
        ...input,
        ...(replyTo ? { replyTo } : {})
      });
      return;
    }

    if (provider === 'postmark') {
      await this.sendWithPostmark({
        from,
        ...input,
        ...(replyTo ? { replyTo } : {})
      });
      return;
    }

    this.logger.warn(`Unknown EMAIL_PROVIDER='${provider}', fallback to console`);
    this.logger.log(`EMAIL(console-fallback) from=${from} to=${input.to} subject=${input.subject}`);
    this.logger.debug(input.html);
  }

  private async sendWithResend(
    input: SendEmailInput & { from: string; replyTo?: string }
  ): Promise<void> {
    const apiKey = this.configService.get<string | undefined>('RESEND_API_KEY');
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER=resend');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: input.from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {})
      })
    });

    if (!response.ok) {
      const body = await this.extractErrorBody(response);
      this.logger.error(`Resend send failed status=${response.status} body=${body}`);
      throw new Error(`Resend request failed with status ${response.status}`);
    }

    this.logger.log(`EMAIL(resend) from=${input.from} to=${input.to} subject=${input.subject}`);
  }

  private async sendWithPostmark(
    input: SendEmailInput & { from: string; replyTo?: string }
  ): Promise<void> {
    const token = this.configService.get<string | undefined>('POSTMARK_SERVER_TOKEN');
    if (!token) {
      throw new Error('POSTMARK_SERVER_TOKEN is required when EMAIL_PROVIDER=postmark');
    }

    const messageStream = this.configService.get<string>('POSTMARK_MESSAGE_STREAM', 'outbound');

    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': token
      },
      body: JSON.stringify({
        From: input.from,
        To: input.to,
        Subject: input.subject,
        HtmlBody: input.html,
        MessageStream: messageStream,
        ...(input.replyTo ? { ReplyTo: input.replyTo } : {})
      })
    });

    if (!response.ok) {
      const body = await this.extractErrorBody(response);
      this.logger.error(`Postmark send failed status=${response.status} body=${body}`);
      throw new Error(`Postmark request failed with status ${response.status}`);
    }

    this.logger.log(`EMAIL(postmark) from=${input.from} to=${input.to} subject=${input.subject}`);
  }

  private async extractErrorBody(response: Response): Promise<string> {
    try {
      const text = await response.text();
      return text.slice(0, 1000);
    } catch {
      return 'unavailable';
    }
  }
}
