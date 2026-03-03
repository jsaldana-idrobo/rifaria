import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model } from 'mongoose';
import { JOB_NAMES, QUEUE_NAMES } from '../jobs/queue-names';
import { Order } from '../schemas/order.schema';
import { Raffle } from '../schemas/raffle.schema';
import { EmailService } from '../services/email.service';
import { postponeEmailTemplate, ticketEmailTemplate } from '../services/email-templates';

@Injectable()
@Processor(QUEUE_NAMES.NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Raffle.name) private readonly raffleModel: Model<Raffle>,
    private readonly emailService: EmailService
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_NAMES.SEND_TICKET_EMAIL:
        await this.handleSendTicketEmail(job.data as { orderId: string });
        return;
      case JOB_NAMES.NOTIFY_POSTPONEMENT:
        await this.handleNotifyPostponement(job.data as { raffleId: string; reason: string });
        return;
      default:
        this.logger.warn(`Unhandled notifications job: ${job.name}`);
    }
  }

  private async handleSendTicketEmail(data: { orderId: string }): Promise<void> {
    const order = await this.orderModel.findById(data.orderId).lean();
    if (order?.status !== 'paid') {
      this.logger.warn(`Order ${data.orderId} not found or not paid for email send`);
      return;
    }

    const raffle = await this.raffleModel.findById(order.raffleId).lean();
    if (!raffle) {
      this.logger.warn(`Raffle ${String(order.raffleId)} not found for email send`);
      return;
    }

    const html = ticketEmailTemplate({
      fullName: order.fullName,
      raffleTitle: raffle.title,
      rafflePrize: raffle.prizeName,
      drawAt: new Date(raffle.drawAt),
      drawSource: raffle.drawSource,
      ticketNumbers: order.ticketNumbers
    });

    await this.emailService.send({
      to: order.email,
      subject: `Tus boletas de Rifaria - ${raffle.title}`,
      html
    });
  }

  private async handleNotifyPostponement(data: {
    raffleId: string;
    reason: string;
  }): Promise<void> {
    const raffle = await this.raffleModel.findById(data.raffleId).lean();
    if (!raffle) {
      this.logger.warn(`Raffle ${data.raffleId} not found for postponement notification`);
      return;
    }

    const paidOrders = await this.orderModel
      .aggregate([
        {
          $match: {
            raffleId: raffle._id,
            status: 'paid'
          }
        },
        {
          $group: {
            _id: '$email',
            fullName: { $first: '$fullName' }
          }
        }
      ])
      .exec();

    for (const participant of paidOrders) {
      const html = postponeEmailTemplate({
        fullName: participant.fullName,
        raffleTitle: raffle.title,
        newDrawAt: new Date(raffle.drawAt),
        reason: data.reason
      });

      await this.emailService.send({
        to: participant._id,
        subject: `Actualizacion de fecha - ${raffle.title}`,
        html
      });
    }

    this.logger.log(
      `Postponement emails sent for raffle=${data.raffleId} recipients=${paidOrders.length}`
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    this.logger.error(
      `Notification job failed: ${job?.name ?? 'unknown'} id=${job?.id ?? 'n/a'} reason=${error.message}`
    );
  }
}
