import type { OrderStatus, PaymentStatus, TicketStatus } from './status.js';

const orderTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  initiated: ['pending_payment', 'failed', 'expired'],
  pending_payment: ['paid', 'failed', 'expired'],
  paid: ['refunded'],
  failed: [],
  expired: [],
  refunded: []
};

const paymentTransitions: Record<PaymentStatus, readonly PaymentStatus[]> = {
  pending: ['approved', 'declined', 'voided', 'error'],
  approved: ['refunded'],
  declined: [],
  voided: [],
  error: [],
  refunded: []
};

const ticketTransitions: Record<TicketStatus, readonly TicketStatus[]> = {
  reserved: ['assigned', 'void'],
  assigned: ['void'],
  void: []
};

export function assertOrderTransition(current: OrderStatus, next: OrderStatus): void {
  if (!orderTransitions[current].includes(next)) {
    throw new Error(`Invalid order transition: ${current} -> ${next}`);
  }
}

export function assertPaymentTransition(current: PaymentStatus, next: PaymentStatus): void {
  if (!paymentTransitions[current].includes(next)) {
    throw new Error(`Invalid payment transition: ${current} -> ${next}`);
  }
}

export function assertTicketTransition(current: TicketStatus, next: TicketStatus): void {
  if (!ticketTransitions[current].includes(next)) {
    throw new Error(`Invalid ticket transition: ${current} -> ${next}`);
  }
}
