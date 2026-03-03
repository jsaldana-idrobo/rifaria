import { describe, expect, it } from 'vitest';
import {
  assertOrderTransition,
  assertPaymentTransition,
  assertTicketTransition
} from './state-machine.js';

describe('state machine transitions', () => {
  it('allows valid order transition', () => {
    expect(() => assertOrderTransition('pending_payment', 'paid')).not.toThrow();
  });

  it('rejects invalid order transition', () => {
    expect(() => assertOrderTransition('initiated', 'paid')).toThrow('Invalid order transition');
  });

  it('rejects invalid payment transition', () => {
    expect(() => assertPaymentTransition('declined', 'approved')).toThrow(
      'Invalid payment transition'
    );
  });

  it('rejects invalid ticket transition', () => {
    expect(() => assertTicketTransition('void', 'assigned')).toThrow('Invalid ticket transition');
  });
});
