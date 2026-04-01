import { describe, expect, it } from 'vitest';
import {
  extractEmailAddress,
  hasInvalidEmailIdentity,
  isLoopbackHost,
  isTemplateValue
} from './env-validation.js';

describe('env validation helpers', () => {
  it('detects placeholder and change-me values without regex backtracking', () => {
    expect(isTemplateValue('  <your-domain>  ')).toBe(true);
    expect(isTemplateValue('resend_placeholder')).toBe(true);
    expect(isTemplateValue('dev-access-secret-change-me')).toBe(true);
    expect(isTemplateValue('https://rifaria.co')).toBe(false);
  });

  it('extracts the raw email from display-name formats', () => {
    expect(extractEmailAddress('Rifaria <no-reply@rifaria.co>')).toBe('no-reply@rifaria.co');
    expect(extractEmailAddress('soporte@rifaria.co')).toBe('soporte@rifaria.co');
  });

  it('rejects local and invalid email identities', () => {
    expect(hasInvalidEmailIdentity('Rifaria <no-reply@rifaria.local>')).toBe(true);
    expect(hasInvalidEmailIdentity('Rifaria <no-reply@localhost>')).toBe(true);
    expect(hasInvalidEmailIdentity('correo-invalido')).toBe(true);
    expect(hasInvalidEmailIdentity('Rifaria <no-reply@rifaria.co>')).toBe(false);
  });

  it('detects loopback hosts in URLs and plain host values', () => {
    expect(isLoopbackHost('127.0.0.1')).toBe(true);
    expect(isLoopbackHost('localhost')).toBe(true);
    expect(isLoopbackHost('mongodb://localhost:27017/rifaria')).toBe(true);
    expect(isLoopbackHost('https://rifaria.co')).toBe(false);
    expect(isLoopbackHost('redis.internal')).toBe(false);
  });
});
