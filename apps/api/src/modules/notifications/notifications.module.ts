import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MongooseModule } from '@nestjs/mongoose';
import { QUEUE_NAMES } from '../../jobs/queue-names';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { PrizeDraw, PrizeDrawSchema } from '../prize-draws/schemas/prize-draw.schema';
import { Raffle, RaffleSchema } from '../raffles/schemas/raffle.schema';
import { EmailService } from './email.service';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: PrizeDraw.name, schema: PrizeDrawSchema },
      { name: Raffle.name, schema: RaffleSchema }
    ]),
    BullModule.registerQueue({
      name: QUEUE_NAMES.NOTIFICATIONS
    })
  ],
  providers: [NotificationsService, EmailService],
  exports: [NotificationsService]
})
export class NotificationsModule {}
