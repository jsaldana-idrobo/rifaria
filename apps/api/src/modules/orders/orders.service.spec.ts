import { Types } from 'mongoose';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let orderModel: { findById: jest.Mock };
  let service: OrdersService;

  beforeEach(() => {
    orderModel = {
      findById: jest.fn()
    };

    service = new OrdersService(orderModel as never, {} as never, {} as never, {} as never);
  });

  it('hides ticket numbers while order is pending payment', async () => {
    const orderId = new Types.ObjectId();
    const createdAt = new Date('2026-02-20T14:00:00.000Z');
    const updatedAt = new Date('2026-02-20T14:05:00.000Z');

    orderModel.findById.mockResolvedValue({
      _id: orderId,
      status: 'pending_payment',
      ticketQty: 10,
      totalAmount: 20000,
      ticketNumbers: ['0001', '0002'],
      expiresAt: new Date('2026-02-20T14:15:00.000Z'),
      failureReason: null,
      createdAt,
      updatedAt
    });

    const result = await service.findPublicStatusByIdOrThrow(String(orderId));

    expect(result).toEqual({
      id: String(orderId),
      status: 'pending_payment',
      ticketQty: 10,
      totalAmount: 20000,
      ticketNumbers: [],
      upcomingPrizeDraws: [],
      expiresAt: new Date('2026-02-20T14:15:00.000Z'),
      failureReason: null,
      createdAt,
      updatedAt
    });
  });

  it('returns assigned ticket numbers when order is paid', async () => {
    const orderId = new Types.ObjectId();
    const upcomingPrizeDraws = [
      {
        id: 'draw-1',
        title: 'Bono semanal',
        displayValue: '$10.000.000',
        drawAt: new Date('2026-03-01T00:00:00.000Z'),
        drawSource: 'Loteria de Medellin',
        status: 'scheduled',
        isMajorPrize: false
      }
    ];

    orderModel.findById.mockResolvedValue({
      _id: orderId,
      raffleId: new Types.ObjectId(),
      status: 'paid',
      ticketQty: 10,
      totalAmount: 20000,
      ticketNumbers: ['0001', '0002'],
      expiresAt: null,
      failureReason: null,
      createdAt: null,
      updatedAt: null
    });
    (
      service as unknown as { rafflesService: { getUpcomingPrizeDrawSummaries: jest.Mock } }
    ).rafflesService = {
      getUpcomingPrizeDrawSummaries: jest.fn().mockResolvedValue(upcomingPrizeDraws)
    };

    const result = await service.findPublicStatusByIdOrThrow(String(orderId));
    expect(result.ticketNumbers).toEqual(['0001', '0002']);
    expect(result.upcomingPrizeDraws).toEqual(upcomingPrizeDraws);
  });
});
