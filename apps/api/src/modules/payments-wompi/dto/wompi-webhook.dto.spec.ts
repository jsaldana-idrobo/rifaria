import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WompiWebhookDto } from './wompi-webhook.dto';

describe('WompiWebhookDto', () => {
  it('accepts a valid webhook payload', async () => {
    const payload = plainToInstance(WompiWebhookDto, {
      event: 'transaction.updated',
      data: {
        transaction: {
          id: 'tx_local_001',
          reference: 'RIF-order-123',
          status: 'APPROVED',
          amount_in_cents: 200000,
          currency: 'COP',
          payment_method_type: 'PSE',
          customer_email: 'buyer@example.com'
        }
      },
      signature: {
        checksum: 'e3b0c44298fc1c149afbf4c8996fb924'
      },
      sent_at: '2026-02-20T19:00:00.000Z'
    });

    const errors = await validate(payload);
    expect(errors).toHaveLength(0);
  });

  it('rejects payloads without transaction reference', async () => {
    const payload = plainToInstance(WompiWebhookDto, {
      event: 'transaction.updated',
      data: {
        transaction: {
          id: 'tx_local_002',
          status: 'APPROVED',
          amount_in_cents: 200000,
          currency: 'COP'
        }
      }
    });

    const errors = await validate(payload);
    expect(errors).not.toHaveLength(0);
  });

  it('rejects payloads with invalid currency format', async () => {
    const payload = plainToInstance(WompiWebhookDto, {
      event: 'transaction.updated',
      data: {
        transaction: {
          id: 'tx_local_003',
          reference: 'RIF-order-123',
          status: 'APPROVED',
          amount_in_cents: 200000,
          currency: 'cop'
        }
      }
    });

    const errors = await validate(payload);
    expect(errors).not.toHaveLength(0);
  });
});
