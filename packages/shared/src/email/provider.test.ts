import { describe, expect, it, vi } from 'vitest';
import { sendEmailWithProvider } from './provider.js';

function createLogger() {
  return {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  };
}

describe('sendEmailWithProvider', () => {
  it('sends resend payloads with reply-to support', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const logger = createLogger();

    await sendEmailWithProvider(
      {
        provider: 'resend',
        from: 'Rifaria <hello@rifaria.co>',
        replyTo: 'support@rifaria.co',
        resendApiKey: 're_test_123',
        fetchImpl,
        logger
      },
      {
        to: 'buyer@example.com',
        subject: 'Boletas',
        html: '<p>OK</p>'
      }
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          from: 'Rifaria <hello@rifaria.co>',
          to: ['buyer@example.com'],
          subject: 'Boletas',
          html: '<p>OK</p>',
          reply_to: 'support@rifaria.co'
        })
      })
    );
    expect(logger.log).toHaveBeenCalledWith(
      'EMAIL(resend) from=Rifaria <hello@rifaria.co> to=buyer@example.com subject=Boletas'
    );
  });

  it('falls back to console logging for unknown providers', async () => {
    const logger = createLogger();

    await sendEmailWithProvider(
      {
        provider: 'mystery',
        from: 'Rifaria <hello@rifaria.co>',
        logger
      },
      {
        to: 'buyer@example.com',
        subject: 'Boletas',
        html: '<p>OK</p>'
      }
    );

    expect(logger.warn).toHaveBeenCalledWith(
      "Unknown EMAIL_PROVIDER='mystery', fallback to console"
    );
    expect(logger.log).toHaveBeenCalledWith(
      'EMAIL(console-fallback) from=Rifaria <hello@rifaria.co> to=buyer@example.com subject=Boletas'
    );
    expect(logger.debug).toHaveBeenCalledWith('<p>OK</p>');
  });
});
