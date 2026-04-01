import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';
import { PrizeDrawsModule } from '../prize-draws/prize-draws.module';
import { RafflesModule } from '../raffles/raffles.module';
import { TicketsModule } from '../tickets/tickets.module';
import { DrawsController } from './draws.controller';
import { DrawsService } from './draws.service';

@Module({
  imports: [
    RafflesModule,
    PrizeDrawsModule,
    TicketsModule,
    NotificationsModule,
    OrdersModule,
    AuditModule
  ],
  controllers: [DrawsController],
  providers: [DrawsService]
})
export class DrawsModule {}
