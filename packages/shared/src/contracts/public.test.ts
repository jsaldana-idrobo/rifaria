import { describe, expect, it } from 'vitest';
import {
  createOrderSchema,
  createPrizeDrawSchema,
  reorderPrizeDrawsSchema,
  settlePrizeDrawSchema
} from './public.js';

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

describe('multi-prize public contracts', () => {
  it('accepts a scheduled prize draw payload', () => {
    const result = createPrizeDrawSchema.safeParse({
      title: 'Bono de apertura',
      description: 'Premio de efectivo para el primer corte semanal',
      prizeType: 'cash',
      displayValue: '$10.000.000',
      imageUrl: 'https://example.com/premio.jpg',
      drawAt: '2026-05-01T00:00:00.000Z',
      drawSource: 'Loteria de Medellin'
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid winning numbers when settling a draw', () => {
    const result = settlePrizeDrawSchema.safeParse({
      winningNumber: '12',
      drawResultSourceUrl: 'https://example.com/resultados'
    });

    expect(result.success).toBe(false);
  });

  it('requires at least one prize draw id for reorder', () => {
    const result = reorderPrizeDrawsSchema.safeParse({ orderedIds: [] });

    expect(result.success).toBe(false);
  });
});
