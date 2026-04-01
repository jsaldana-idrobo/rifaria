import { Types } from 'mongoose';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let notificationsQueue: { add: jest.Mock };
  let configService: { get: jest.Mock };
  let orderModel: { findById: jest.Mock; aggregate: jest.Mock };
  let prizeDrawModel: { find: jest.Mock };
  let raffleModel: { findById: jest.Mock };
  let emailService: { send: jest.Mock };
  let service: NotificationsService;

  beforeEach(() => {
    notificationsQueue = {
      add: jest.fn()
    };
    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'NOTIFICATIONS_MODE') {
          return 'queue';
        }

        return defaultValue;
      })
    };
    orderModel = {
      findById: jest.fn(),
      aggregate: jest.fn()
    };
    prizeDrawModel = {
      find: jest.fn()
    };
    raffleModel = {
      findById: jest.fn()
    };
    emailService = {
      send: jest.fn()
    };

    service = new NotificationsService(
      notificationsQueue as never,
      configService as never,
      orderModel as never,
      prizeDrawModel as never,
      raffleModel as never,
      emailService as never
    );
  });

  it('queues the paid ticket email when notifications mode is queue', async () => {
    notificationsQueue.add.mockResolvedValue(undefined);

    await expect(service.sendTicketEmail('order-1')).resolves.toBe('queued');

    expect(notificationsQueue.add).toHaveBeenCalledTimes(1);
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('sends the paid ticket email inline when notifications mode is inline', async () => {
    const raffleId = new Types.ObjectId();
    const orderId = new Types.ObjectId();

    configService.get.mockImplementation((key: string, defaultValue?: string) => {
      if (key === 'NOTIFICATIONS_MODE') {
        return 'inline';
      }

      return defaultValue;
    });
    orderModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: orderId,
        raffleId,
        status: 'paid',
        fullName: 'Juan Saldana',
        email: 'jsaldana.idrobo@gmail.com',
        ticketNumbers: ['0184', '3342']
      })
    });
    raffleModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: raffleId,
        title: 'Rifa Rifaria',
        prizeName: 'Moto de lanzamiento',
        drawAt: new Date('2026-04-10T18:00:00.000Z'),
        drawSource: 'Loteria de Medellin'
      })
    });
    prizeDrawModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              title: 'Primer premio',
              displayValue: '$10.000.000',
              drawAt: new Date('2026-04-02T18:00:00.000Z'),
              status: 'scheduled'
            }
          ])
        })
      })
    });
    emailService.send.mockResolvedValue(undefined);

    await expect(service.sendTicketEmail(String(orderId))).resolves.toBe('sent');

    expect(notificationsQueue.add).not.toHaveBeenCalled();
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jsaldana.idrobo@gmail.com',
        subject: 'Tus boletas de Rifaria - Rifa Rifaria'
      })
    );
  });
});
