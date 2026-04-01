import { shouldEnableNotificationQueue } from './notifications-mode';

describe('shouldEnableNotificationQueue', () => {
  it('returns false when notifications mode is inline', () => {
    expect(
      shouldEnableNotificationQueue({
        NOTIFICATIONS_MODE: 'inline'
      })
    ).toBe(false);
  });

  it('returns true when notifications mode is queue', () => {
    expect(
      shouldEnableNotificationQueue({
        NOTIFICATIONS_MODE: 'queue'
      })
    ).toBe(true);
  });

  it('defaults to queue mode when notifications mode is missing', () => {
    expect(shouldEnableNotificationQueue({})).toBe(true);
  });
});
