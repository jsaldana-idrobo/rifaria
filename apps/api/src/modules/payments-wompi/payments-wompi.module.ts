import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';
import { RafflesModule } from '../raffles/raffles.module';
import { TicketsModule } from '../tickets/tickets.module';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { PaymentsWompiController } from './payments-wompi.controller';
import { PaymentsWompiService } from './payments-wompi.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    OrdersModule,
    TicketsModule,
    RafflesModule,
    NotificationsModule,
    AuditModule
  ],
  controllers: [PaymentsWompiController],
  providers: [PaymentsWompiService],
  exports: [PaymentsWompiService, MongooseModule]
})
export class PaymentsWompiModule {}
