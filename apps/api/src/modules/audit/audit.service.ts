import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { AuditLog } from './schemas/audit-log.schema';

@Injectable()
export class AuditService {
  constructor(@InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLog>) {}

  async log(event: CreateAuditLogDto): Promise<void> {
    await this.auditModel.create({
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      actorType: event.actorType,
      actorId: event.actorId ?? null,
      metadata: event.metadata ?? {}
    });
  }
}
