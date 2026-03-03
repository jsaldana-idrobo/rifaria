import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomTicketNumber } from './ticket-number.js';

describe('randomTicketNumber', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses a cryptographically secure generator', () => {
    const getRandomValues = vi.fn((buffer: Uint32Array) => {
      buffer[0] = 1234;
      return buffer;
    });

    vi.stubGlobal('crypto', { getRandomValues });

    expect(randomTicketNumber()).toBe('1234');
    expect(getRandomValues).toHaveBeenCalledTimes(1);
  });

  it('retries values that would introduce modulo bias', () => {
    const values = [4_294_965_000, 42];
    const getRandomValues = vi.fn((buffer: Uint32Array) => {
      const nextValue = values.shift();
      if (nextValue === undefined) {
        throw new Error('Missing test entropy');
      }

      buffer[0] = nextValue;
      return buffer;
    });

    vi.stubGlobal('crypto', { getRandomValues });

    expect(randomTicketNumber()).toBe('0042');
    expect(getRandomValues).toHaveBeenCalledTimes(2);
  });

  it('fails fast when secure randomness is unavailable', () => {
    vi.stubGlobal('crypto', undefined);

    expect(() => randomTicketNumber()).toThrow('Secure random generator is not available');
  });
});
