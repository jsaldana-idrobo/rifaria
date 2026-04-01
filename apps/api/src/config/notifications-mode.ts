export function shouldEnableNotificationQueue(source: NodeJS.ProcessEnv = process.env): boolean {
  return (source.NOTIFICATIONS_MODE ?? 'queue') === 'queue';
}
