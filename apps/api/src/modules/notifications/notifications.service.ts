import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JOB_NAMES, QUEUE_NAMES } from '../../jobs/queue-names';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue
  ) {}

  async enqueueTicketEmail(orderId: string): Promise<void> {
    await this.notificationsQueue.add(
      JOB_NAMES.SEND_TICKET_EMAIL,
      { orderId },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: true,
        removeOnFail: 500
      }
    );
  }

  async enqueuePostponement(raffleId: string, reason: string): Promise<void> {
    await this.notificationsQueue.add(
      JOB_NAMES.NOTIFY_POSTPONEMENT,
      { raffleId, reason },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: true,
        removeOnFail: 500
      }
    );
  }
}
