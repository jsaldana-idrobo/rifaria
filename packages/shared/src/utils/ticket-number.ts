import { MAX_TICKET_NUMBER, TICKET_RANGE_SIZE } from '../domain/constants.js';

export function formatTicketNumber(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > MAX_TICKET_NUMBER) {
    throw new Error('Ticket number must be an integer between 0 and 9999');
  }

  return value.toString().padStart(4, '0');
}

export function parseTicketNumber(value: string): number {
  if (!/^\d{4}$/.test(value)) {
    throw new Error('Ticket number must be exactly 4 digits');
  }

  return Number.parseInt(value, 10);
}

export function randomTicketNumber(): string {
  const number = Math.floor(Math.random() * TICKET_RANGE_SIZE);
  return formatTicketNumber(number);
}
