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

function secureRandomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error('Max value must be a positive integer');
  }

  const cryptoApi = globalThis.crypto;
  if (cryptoApi === undefined || typeof cryptoApi.getRandomValues !== 'function') {
    throw new Error('Secure random generator is not available');
  }

  const maxUint32Exclusive = 2 ** 32;
  const unbiasedUpperBound = maxUint32Exclusive - (maxUint32Exclusive % maxExclusive);
  const buffer = new Uint32Array(1);

  while (true) {
    cryptoApi.getRandomValues(buffer);
    const value = buffer.at(0);
    if (value === undefined) {
      throw new Error('Secure random generator failed');
    }

    if (value < unbiasedUpperBound) {
      return value % maxExclusive;
    }
  }
}

export function randomTicketNumber(): string {
  const number = secureRandomInt(TICKET_RANGE_SIZE);
  return formatTicketNumber(number);
}
