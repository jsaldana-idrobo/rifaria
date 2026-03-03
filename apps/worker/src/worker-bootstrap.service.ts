import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { JOB_NAMES, QUEUE_NAMES } from './jobs/queue-names';

@Injectable()
export class WorkerBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(WorkerBootstrapService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.TICKETS)
    private readonly ticketsQueue: Queue
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ticketsQueue.add(
      JOB_NAMES.RELEASE_EXPIRED_RESERVATIONS,
      {},
      {
        repeat: {
          every: 60_000
        },
        removeOnComplete: true,
        removeOnFail: 100,
        jobId: 'release-expired-reservations-repeat'
      }
    );

    this.logger.log('Scheduled periodic job for expired reservation cleanup');
  }
}
