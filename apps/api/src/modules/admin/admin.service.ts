import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { Order } from '../orders/schemas/order.schema';
import { OrdersService } from '../orders/orders.service';
import { Payment } from '../payments-wompi/schemas/payment.schema';
import { PaymentsWompiService } from '../payments-wompi/payments-wompi.service';
import { RafflesService } from '../raffles/raffles.service';
import { UpdateRaffleDto } from '../raffles/dto/update-raffle.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly rafflesService: RafflesService,
    private readonly ordersService: OrdersService,
    private readonly paymentsWompiService: PaymentsWompiService,
    private readonly authService: AuthService,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>
  ) {}

  async getDashboard() {
    const raffle = await this.rafflesService.getActivePublicRaffle();

    const [orderCounts, paymentCounts] = await Promise.all([
      this.orderModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      this.paymentModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);

    const progress = raffle.totalTickets > 0 ? raffle.soldTickets / raffle.totalTickets : 0;

    return {
      raffle: {
        id: raffle._id,
        title: raffle.title,
        prizeName: raffle.prizeName,
        status: raffle.status,
        soldTickets: raffle.soldTickets,
        totalTickets: raffle.totalTickets,
        progress,
        grossRevenueCop: raffle.soldTickets * 2000,
        drawAt: raffle.drawAt,
        drawSource: raffle.drawSource
      },
      orderCounts,
      paymentCounts
    };
  }

  async listOrders(limit = 100) {
    return this.ordersService.listLatest(limit);
  }

  async listPayments(limit = 100) {
    return this.paymentsWompiService.listLatest(limit);
  }

  async listUsers(limit = 100) {
    return this.authService.listUsers(limit);
  }

  async updateRaffle(raffleId: string, dto: UpdateRaffleDto) {
    return this.rafflesService.updateRaffle(raffleId, dto);
  }
}
