import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';

@Module({
  imports: [OrdersModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService]
})
export class MaintenanceModule {}
