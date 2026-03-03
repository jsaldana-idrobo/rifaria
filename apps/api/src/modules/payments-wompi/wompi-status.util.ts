import type { PaymentStatus } from '@rifaria/shared';

export function mapWompiStatus(status: string): PaymentStatus {
  switch (status.toUpperCase()) {
    case 'APPROVED':
      return 'approved';
    case 'DECLINED':
      return 'declined';
    case 'VOIDED':
      return 'voided';
    case 'ERROR':
      return 'error';
    case 'PENDING':
    default:
      return 'pending';
  }
}
