import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';
import { Payment, PaymentSchema } from '../payments-wompi/schemas/payment.schema';
import { PaymentsWompiModule } from '../payments-wompi/payments-wompi.module';
import { RafflesModule } from '../raffles/raffles.module';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Payment.name, schema: PaymentSchema }
    ]),
    AuthModule,
    OrdersModule,
    PaymentsWompiModule,
    RafflesModule
  ],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
