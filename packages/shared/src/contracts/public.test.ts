import { describe, expect, it } from 'vitest';
import { createOrderSchema } from './public.js';

describe('createOrderSchema', () => {
  it('rejects purchases below minimum ticket count', () => {
    const result = createOrderSchema.safeParse({
      fullName: 'Ana Torres',
      email: 'ana@example.com',
      phone: '3000000000',
      ticketQty: 9
    });

    expect(result.success).toBe(false);
  });

  it('accepts valid payload with minimum 10 tickets', () => {
    const result = createOrderSchema.safeParse({
      fullName: 'Ana Torres',
      email: 'ana@example.com',
      phone: '3000000000',
      ticketQty: 10
    });

    expect(result.success).toBe(true);
  });
});
