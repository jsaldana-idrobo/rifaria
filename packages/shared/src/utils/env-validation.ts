function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function isTemplateValue(value: string): boolean {
  const normalized = normalize(value);
  return (
    (normalized.startsWith('<') && normalized.endsWith('>')) ||
    normalized.includes('placeholder') ||
    normalized.includes('change-me')
  );
}

export function extractEmailAddress(value: string): string {
  const trimmed = value.trim();
  const start = trimmed.indexOf('<');
  const end = trimmed.lastIndexOf('>');

  if (start >= 0 && end > start) {
    return trimmed.slice(start + 1, end).trim();
  }

  return trimmed;
}

function isValidBasicEmail(email: string): boolean {
  if (email.length === 0 || email.includes(' ')) {
    return false;
  }

  const atIndex = email.indexOf('@');
  if (atIndex <= 0 || atIndex !== email.lastIndexOf('@') || atIndex === email.length - 1) {
    return false;
  }

  const domain = email.slice(atIndex + 1);
  const dotIndex = domain.indexOf('.');
  return dotIndex > 0 && dotIndex < domain.length - 1;
}

export function isLoopbackHost(value: string): boolean {
  const trimmed = value.trim();

  try {
    const parsed = new URL(trimmed);
    const hostname = normalize(parsed.hostname);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    const normalized = normalize(trimmed);
    return (
      normalized === 'localhost' ||
      normalized === '127.0.0.1' ||
      normalized.includes('://localhost')
    );
  }
}

export function hasInvalidEmailIdentity(value: string): boolean {
  if (isTemplateValue(value)) {
    return true;
  }

  const email = extractEmailAddress(value);
  if (!isValidBasicEmail(email)) {
    return true;
  }

  const domain = normalize(email.slice(email.lastIndexOf('@') + 1));
  return domain === 'localhost' || domain === '127.0.0.1' || domain.endsWith('.local');
}
