export const TICKET_PRICE_COP = 2000;
export const MIN_TICKETS_PER_ORDER = 10;
export const MAX_TICKET_NUMBER = 9999;
export const TICKET_RANGE_SIZE = MAX_TICKET_NUMBER + 1;
export const DEFAULT_RESERVATION_MINUTES = 15;

export function computeOrderTotal(ticketQty: number): number {
  return ticketQty * TICKET_PRICE_COP;
}
