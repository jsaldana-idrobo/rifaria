import { Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MaintenanceService } from './maintenance.service';

@Controller('internal/maintenance')
export class MaintenanceController {
  constructor(
    private readonly configService: ConfigService,
    private readonly maintenanceService: MaintenanceService
  ) {}

  @Post('release-expired-reservations')
  async releaseExpiredReservations(@Headers('x-maintenance-token') token?: string) {
    const expectedToken = this.configService.get<string>('MAINTENANCE_TOKEN', '');

    if (!token || !expectedToken || token !== expectedToken) {
      throw new UnauthorizedException('Invalid maintenance token');
    }

    const summary = await this.maintenanceService.releaseExpiredReservations();

    return {
      ...summary,
      executedAt: new Date().toISOString()
    };
  }
}
