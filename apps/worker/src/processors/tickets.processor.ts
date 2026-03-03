import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model } from 'mongoose';
import { JOB_NAMES, QUEUE_NAMES } from '../jobs/queue-names';
import { Order } from '../schemas/order.schema';
import { Ticket } from '../schemas/ticket.schema';

@Injectable()
@Processor(QUEUE_NAMES.TICKETS)
export class TicketsProcessor extends WorkerHost {
  private readonly logger = new Logger(TicketsProcessor.name);

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Ticket.name) private readonly ticketModel: Model<Ticket>
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOB_NAMES.RELEASE_EXPIRED_RESERVATIONS) {
      this.logger.warn(`Unhandled tickets job: ${job.name}`);
      return;
    }

    const now = new Date();
    const expiredOrders = await this.orderModel
      .find({
        status: 'pending_payment',
        expiresAt: { $lte: now }
      })
      .lean();

    if (expiredOrders.length === 0) {
      return;
    }

    for (const order of expiredOrders) {
      await this.orderModel.updateOne(
        {
          _id: order._id,
          status: 'pending_payment'
        },
        {
          $set: {
            status: 'expired',
            failureReason: 'Reservation expired before payment confirmation'
          }
        }
      );

      await this.ticketModel.deleteMany({
        orderId: order._id,
        status: 'reserved'
      });
    }

    this.logger.log(`Expired reservations released: ${expiredOrders.length}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    this.logger.error(
      `Ticket job failed: ${job?.name ?? 'unknown'} id=${job?.id ?? 'n/a'} reason=${error.message}`
    );
  }
}
