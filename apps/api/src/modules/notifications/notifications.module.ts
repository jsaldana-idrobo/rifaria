import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../jobs/queue-names';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.NOTIFICATIONS
    })
  ],
  providers: [NotificationsService],
  exports: [NotificationsService]
})
export class NotificationsModule {}
