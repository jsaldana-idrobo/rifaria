import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { OrdersModule } from '../orders/orders.module';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Payment, PaymentSchema } from '../payments-wompi/schemas/payment.schema';
import { PaymentsWompiModule } from '../payments-wompi/payments-wompi.module';
import { PrizeDrawsModule } from '../prize-draws/prize-draws.module';
import { RafflesModule } from '../raffles/raffles.module';
import { Ticket, TicketSchema } from '../tickets/schemas/ticket.schema';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Ticket.name, schema: TicketSchema }
    ]),
    AuditModule,
    AuthModule,
    OrdersModule,
    PaymentsWompiModule,
    PrizeDrawsModule,
    RafflesModule
  ],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
