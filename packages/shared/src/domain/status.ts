export const raffleStatuses = [
  'draft',
  'published',
  'selling',
  'postponed',
  'drawn',
  'closed',
  'cancelled'
] as const;
export type RaffleStatus = (typeof raffleStatuses)[number];

export const orderStatuses = [
  'initiated',
  'pending_payment',
  'paid',
  'failed',
  'expired',
  'refunded'
] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const ticketStatuses = ['reserved', 'assigned', 'void'] as const;
export type TicketStatus = (typeof ticketStatuses)[number];

export const paymentStatuses = [
  'pending',
  'approved',
  'declined',
  'voided',
  'error',
  'refunded'
] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];
