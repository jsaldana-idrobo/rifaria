import { Injectable } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class MaintenanceService {
  constructor(private readonly ordersService: OrdersService) {}

  async releaseExpiredReservations(): Promise<{
    releasedOrders: number;
    releasedTickets: number;
  }> {
    return this.ordersService.expirePendingOrders();
  }
}
