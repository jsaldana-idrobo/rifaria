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
      expiresAt: new Date('2026-02-20T14:15:00.000Z'),
      failureReason: null,
      createdAt,
      updatedAt
    });
  });

  it('returns assigned ticket numbers when order is paid', async () => {
    const orderId = new Types.ObjectId();

    orderModel.findById.mockResolvedValue({
      _id: orderId,
      status: 'paid',
      ticketQty: 10,
      totalAmount: 20000,
      ticketNumbers: ['0001', '0002'],
      expiresAt: null,
      failureReason: null,
      createdAt: null,
      updatedAt: null
    });

    const result = await service.findPublicStatusByIdOrThrow(String(orderId));
    expect(result.ticketNumbers).toEqual(['0001', '0002']);
  });
});
