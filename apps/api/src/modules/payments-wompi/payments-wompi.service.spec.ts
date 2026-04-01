import { Types } from 'mongoose';
import { PaymentsWompiService } from './payments-wompi.service';
import { WompiWebhookDto } from './dto/wompi-webhook.dto';

describe('PaymentsWompiService', () => {
  let paymentModel: { findOne: jest.Mock; create: jest.Mock };
  let configService: { get: jest.Mock };
  let ordersService: {
    findByIdOrThrow: jest.Mock;
    markPaid: jest.Mock;
    markFailed: jest.Mock;
    markEmailQueued: jest.Mock;
    markEmailFailed: jest.Mock;
  };
  let ticketsService: {
    assignTicketsForOrder: jest.Mock;
    listAssignedTicketNumbersForOrder: jest.Mock;
    countAssignedByRaffle: jest.Mock;
    releaseTicketsForOrder: jest.Mock;
  };
  let rafflesService: { setSoldTickets: jest.Mock };
  let notificationsService: { enqueueTicketEmail: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: PaymentsWompiService;

  beforeEach(() => {
    paymentModel = {
      findOne: jest.fn(),
      create: jest.fn()
    };
    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'WOMPI_EVENTS_SECRET') {
          return 'events_placeholder';
        }

        return defaultValue;
      })
    };
    ordersService = {
      findByIdOrThrow: jest.fn(),
      markPaid: jest.fn(),
      markFailed: jest.fn(),
      markEmailQueued: jest.fn(),
      markEmailFailed: jest.fn()
    };
    ticketsService = {
      assignTicketsForOrder: jest.fn(),
      listAssignedTicketNumbersForOrder: jest.fn(),
      countAssignedByRaffle: jest.fn(),
      releaseTicketsForOrder: jest.fn()
    };
    rafflesService = {
      setSoldTickets: jest.fn()
    };
    notificationsService = {
      enqueueTicketEmail: jest.fn()
    };
    auditService = {
      log: jest.fn()
    };

    service = new PaymentsWompiService(
      paymentModel as never,
      configService as never,
      ordersService as never,
      ticketsService as never,
      rafflesService as never,
      notificationsService as never,
      auditService as never
    );
  });

  it('reconciles duplicate approved events when the order is still pending', async () => {
    const orderId = new Types.ObjectId();
    const raffleId = new Types.ObjectId();
    const paymentId = new Types.ObjectId();

    paymentModel.findOne.mockResolvedValue({
      _id: paymentId,
      orderId,
      reference: 'RIF-REF-1',
      providerTransactionId: 'tx-approved-1',
      status: 'approved',
      save: jest.fn()
    });

    ordersService.findByIdOrThrow.mockResolvedValue({
      _id: orderId,
      raffleId,
      status: 'pending_payment'
    });
    ticketsService.assignTicketsForOrder.mockResolvedValue(['0001', '0002']);
    ordersService.markPaid.mockResolvedValue({
      _id: orderId,
      raffleId,
      status: 'paid'
    });
    ticketsService.countAssignedByRaffle.mockResolvedValue(2);

    const payload: WompiWebhookDto = {
      event: 'transaction.updated',
      data: {
        transaction: {
          id: 'tx-approved-1',
          reference: 'RIF-REF-1',
          status: 'APPROVED',
          amount_in_cents: 200000,
          currency: 'COP'
        }
      }
    };

    await expect(service.handleWebhook(payload)).resolves.toEqual({
      ok: true,
      status: 'approved',
      orderId: String(orderId),
      idempotent: true
    });

    expect(ordersService.markPaid).toHaveBeenCalledTimes(1);
    expect(ordersService.markEmailQueued).toHaveBeenCalledWith(orderId);
    expect(rafflesService.setSoldTickets).toHaveBeenCalledWith(raffleId, 2);
    expect(notificationsService.enqueueTicketEmail).toHaveBeenCalledWith(String(orderId));
    expect(auditService.log).toHaveBeenCalledTimes(1);
  });

  it('keeps approved duplicate events idempotent when the order is already paid', async () => {
    const orderId = new Types.ObjectId();
    const raffleId = new Types.ObjectId();

    paymentModel.findOne.mockResolvedValue({
      _id: new Types.ObjectId(),
      orderId,
      reference: 'RIF-REF-2',
      providerTransactionId: 'tx-approved-2',
      status: 'approved',
      save: jest.fn()
    });

    ordersService.findByIdOrThrow.mockResolvedValue({
      _id: orderId,
      raffleId,
      status: 'paid'
    });
    ticketsService.countAssignedByRaffle.mockResolvedValue(10);

    const payload: WompiWebhookDto = {
      event: 'transaction.updated',
      data: {
        transaction: {
          id: 'tx-approved-2',
          reference: 'RIF-REF-2',
          status: 'APPROVED',
          amount_in_cents: 200000,
          currency: 'COP'
        }
      }
    };

    await expect(service.handleWebhook(payload)).resolves.toEqual({
      ok: true,
      status: 'approved',
      orderId: String(orderId),
      idempotent: true
    });

    expect(ordersService.markPaid).not.toHaveBeenCalled();
    expect(notificationsService.enqueueTicketEmail).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
    expect(rafflesService.setSoldTickets).toHaveBeenCalledWith(raffleId, 10);
  });

  it('reconciles duplicate failed events without duplicating failure audit', async () => {
    const orderId = new Types.ObjectId();

    paymentModel.findOne.mockResolvedValue({
      _id: new Types.ObjectId(),
      orderId,
      reference: 'RIF-REF-3',
      providerTransactionId: 'tx-declined-1',
      status: 'declined',
      save: jest.fn()
    });

    ordersService.findByIdOrThrow.mockResolvedValue({
      _id: orderId,
      status: 'failed'
    });
    ticketsService.releaseTicketsForOrder.mockResolvedValue(0);
    ordersService.markFailed.mockResolvedValue({
      _id: orderId,
      status: 'failed'
    });

    const payload: WompiWebhookDto = {
      event: 'transaction.updated',
      data: {
        transaction: {
          id: 'tx-declined-1',
          reference: 'RIF-REF-3',
          status: 'DECLINED',
          amount_in_cents: 200000,
          currency: 'COP'
        }
      }
    };

    await expect(service.handleWebhook(payload)).resolves.toEqual({
      ok: true,
      status: 'declined',
      idempotent: true
    });

    expect(ticketsService.releaseTicketsForOrder).toHaveBeenCalledWith(orderId);
    expect(ordersService.markFailed).toHaveBeenCalledWith(
      orderId,
      'failed',
      'Wompi status: DECLINED'
    );
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('creates pending checkout payments without persisting a null provider transaction id', async () => {
    const orderId = new Types.ObjectId();
    const paymentId = new Types.ObjectId();

    ordersService.findByIdOrThrow.mockResolvedValue({
      _id: orderId,
      status: 'pending_payment',
      totalAmount: 20000
    });
    paymentModel.create.mockResolvedValue({
      _id: paymentId
    });
    configService.get.mockImplementation((key: string, defaultValue?: string) => {
      if (key === 'WOMPI_INTEGRITY_SECRET') {
        return 'integrity-secret';
      }

      if (key === 'WOMPI_PUBLIC_KEY') {
        return 'pub_test_123';
      }

      return defaultValue;
    });

    await service.createCheckout({
      orderId: String(orderId),
      returnUrl: 'http://localhost:4321/gracias'
    });

    expect(paymentModel.create).toHaveBeenCalledWith(
      expect.not.objectContaining({
        providerTransactionId: null
      })
    );
  });
});
