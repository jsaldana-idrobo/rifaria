import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bullmq';
import { Model } from 'mongoose';
import { JOB_NAMES, QUEUE_NAMES } from '../../jobs/queue-names';
import { Order } from '../orders/schemas/order.schema';
import { PrizeDraw } from '../prize-draws/schemas/prize-draw.schema';
import { Raffle } from '../raffles/schemas/raffle.schema';
import { postponeEmailTemplate, ticketEmailTemplate } from './email-templates';
import { EmailService } from './email.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Optional()
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue | null,
    private readonly configService: ConfigService,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(PrizeDraw.name) private readonly prizeDrawModel: Model<PrizeDraw>,
    @InjectModel(Raffle.name) private readonly raffleModel: Model<Raffle>,
    private readonly emailService: EmailService
  ) {}

  async sendTicketEmail(orderId: string): Promise<'queued' | 'sent'> {
    if (this.getNotificationsMode() === 'queue') {
      if (!this.notificationsQueue) {
        throw new Error('Notifications queue is not configured');
      }

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

      return 'queued';
    }

    const order = await this.orderModel.findById(orderId).lean();
    if (!order || order.status !== 'paid') {
      throw new NotFoundException('Paid order not found for ticket email send');
    }

    const raffle = await this.raffleModel.findById(order.raffleId).lean();
    if (!raffle) {
      throw new NotFoundException('Raffle not found for ticket email send');
    }

    const upcomingPrizeDraws = await this.prizeDrawModel
      .find({
        raffleId: order.raffleId,
        status: 'scheduled'
      })
      .sort({ drawAt: 1 })
      .limit(4)
      .lean();

    const html = ticketEmailTemplate({
      fullName: order.fullName,
      raffleTitle: raffle.title,
      rafflePrize: raffle.prizeName,
      drawAt: new Date(raffle.drawAt),
      drawSource: raffle.drawSource,
      ticketNumbers: order.ticketNumbers,
      upcomingPrizeDraws: upcomingPrizeDraws.map((draw) => ({
        title: draw.title,
        displayValue: draw.displayValue,
        drawAt: new Date(draw.drawAt)
      }))
    });

    await this.emailService.send({
      to: order.email,
      subject: `Tus boletas de Rifaria - ${raffle.title}`,
      html
    });

    return 'sent';
  }

  async notifyPostponement(raffleId: string, reason: string): Promise<'queued' | 'sent'> {
    if (this.getNotificationsMode() === 'queue') {
      if (!this.notificationsQueue) {
        throw new Error('Notifications queue is not configured');
      }

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

      return 'queued';
    }

    const raffle = await this.raffleModel.findById(raffleId).lean();
    if (!raffle) {
      throw new NotFoundException('Raffle not found for postponement notification');
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
        reason
      });

      await this.emailService.send({
        to: participant._id,
        subject: `Actualizacion de fecha - ${raffle.title}`,
        html
      });
    }

    this.logger.log(
      `Postponement emails sent inline for raffle=${raffleId} recipients=${paidOrders.length}`
    );

    return 'sent';
  }

  private getNotificationsMode(): 'inline' | 'queue' {
    return this.configService.get<'inline' | 'queue'>('NOTIFICATIONS_MODE', 'queue');
  }
}
