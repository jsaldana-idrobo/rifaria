export class CreateAuditLogDto {
  action!: string;
  entityType!: string;
  entityId!: string;
  actorType!: 'system' | 'user' | 'admin';
  actorId?: string | null;
  metadata?: Record<string, unknown>;
}
