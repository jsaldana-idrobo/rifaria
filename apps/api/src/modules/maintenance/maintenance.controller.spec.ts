import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';

describe('MaintenanceController', () => {
  let configService: { get: jest.Mock };
  let maintenanceService: { releaseExpiredReservations: jest.Mock };
  let controller: MaintenanceController;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'MAINTENANCE_TOKEN') {
          return 'maintenance-super-secret-123456';
        }

        return defaultValue;
      })
    };
    maintenanceService = {
      releaseExpiredReservations: jest.fn()
    };

    controller = new MaintenanceController(
      configService as unknown as ConfigService,
      maintenanceService as unknown as MaintenanceService
    );
  });

  it('rejects requests without the maintenance token header', async () => {
    await expect(controller.releaseExpiredReservations()).rejects.toBeInstanceOf(
      UnauthorizedException
    );
    expect(maintenanceService.releaseExpiredReservations).not.toHaveBeenCalled();
  });

  it('returns a cleanup summary when the maintenance token is valid', async () => {
    maintenanceService.releaseExpiredReservations.mockResolvedValue({
      releasedOrders: 2,
      releasedTickets: 14
    });

    await expect(
      controller.releaseExpiredReservations('maintenance-super-secret-123456')
    ).resolves.toEqual(
      expect.objectContaining({
        releasedOrders: 2,
        releasedTickets: 14,
        executedAt: expect.any(String)
      })
    );
  });
});
