export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  TICKETS: 'tickets'
} as const;

export const JOB_NAMES = {
  SEND_TICKET_EMAIL: 'send-ticket-email',
  NOTIFY_POSTPONEMENT: 'notify-postponement',
  RELEASE_EXPIRED_RESERVATIONS: 'release-expired-reservations'
} as const;
