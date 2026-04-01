import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { assertPaymentTransition } from '@rifaria/shared';
import { createHash, timingSafeEqual } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrdersService } from '../orders/orders.service';
import { RafflesService } from '../raffles/raffles.service';
import { TicketsService } from '../tickets/tickets.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { WompiWebhookDto } from './dto/wompi-webhook.dto';
import { Payment } from './schemas/payment.schema';
import { mapWompiStatus } from './wompi-status.util';

@Injectable()
export class PaymentsWompiService {
  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
    private readonly ticketsService: TicketsService,
    private readonly rafflesService: RafflesService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService
  ) {}

  async createCheckout(dto: CreateCheckoutDto) {
    const order = await this.ordersService.findByIdOrThrow(dto.orderId);

    if (order.status !== 'pending_payment') {
      throw new BadRequestException(`Order is not payable in status ${order.status}`);
    }

    const amountInCents = order.totalAmount * 100;
    const currency = 'COP';
    const reference = `RIF-${order._id}-${Date.now()}`;

    const payment = await this.paymentModel.create({
      orderId: order._id,
      provider: 'wompi',
      reference,
      status: 'pending',
      amountInCents,
      currency,
      providerPayload: {
        createdBy: 'api.checkout'
      }
    });

    const integritySecret = this.configService.get<string>('WOMPI_INTEGRITY_SECRET', '');
    const integrity = this.generateIntegrityHash(
      reference,
      amountInCents,
      currency,
      integritySecret
    );

    const publicKey = this.configService.get<string>('WOMPI_PUBLIC_KEY', 'pk_test_placeholder');
    const params = new URLSearchParams({
      'public-key': publicKey,
      currency,
      'amount-in-cents': String(amountInCents),
      reference,
      'redirect-url': dto.returnUrl,
      'integrity-signature': integrity
    });

    return {
      paymentId: String(payment._id),
      reference,
      checkoutUrl: `https://checkout.wompi.co/p/?${params.toString()}`,
      amountInCents,
      currency,
      orderId: String(order._id)
    };
  }

  async handleWebhook(payload: WompiWebhookDto, receivedChecksum?: string) {
    const transaction = payload.data?.transaction;
    if (!transaction?.reference) {
      throw new BadRequestException('Invalid webhook payload: missing transaction reference');
    }

    const payment = await this.paymentModel.findOne({ reference: transaction.reference });
    if (!payment) {
      throw new NotFoundException('Payment reference not found');
    }

    this.verifyChecksumOrThrow(payload, receivedChecksum);

    const mappedStatus = mapWompiStatus(transaction.status);

    const providerTransactionId = transaction.id;
    const isDuplicateEvent =
      payment.providerTransactionId === providerTransactionId && payment.status === mappedStatus;

    if (!isDuplicateEvent) {
      if (payment.status !== mappedStatus) {
        assertPaymentTransition(payment.status, mappedStatus);
        payment.status = mappedStatus;
      }

      payment.providerTransactionId = providerTransactionId;
      payment.providerPayload = payload as unknown as Record<string, unknown>;

      if (mappedStatus === 'approved') {
        payment.approvedAt = new Date();
        payment.failureReason = null;
      } else if (mappedStatus !== 'pending') {
        payment.failureReason = `Wompi status: ${transaction.status}`;
      }

      await payment.save();
    }

    const orderId = payment.orderId;

    if (mappedStatus === 'approved') {
      return this.handleApprovedStatus(payment, orderId, isDuplicateEvent);
    }

    if (['declined', 'voided', 'error'].includes(mappedStatus)) {
      const order = await this.ordersService.findByIdOrThrow(String(orderId));
      const alreadyFailed = ['failed', 'expired'].includes(order.status);

      await this.ticketsService.releaseTicketsForOrder(orderId);
      await this.ordersService.markFailed(orderId, 'failed', `Wompi status: ${transaction.status}`);

      if (!alreadyFailed) {
        await this.auditService.log({
          action: 'payment.failed',
          entityType: 'payment',
          entityId: String(payment._id),
          actorType: 'system',
          actorId: null,
          metadata: {
            provider: 'wompi',
            reference: payment.reference,
            orderId: String(orderId),
            providerStatus: transaction.status
          }
        });
      }

      return { ok: true, status: mappedStatus, idempotent: isDuplicateEvent };
    }

    if (isDuplicateEvent) {
      return { ok: true, status: mappedStatus, idempotent: true };
    }

    return { ok: true, status: mappedStatus };
  }

  async listLatest(limit = 100): Promise<Payment[]> {
    return this.paymentModel.find().sort({ createdAt: -1 }).limit(limit).lean();
  }

  private async handleApprovedStatus(
    payment: Payment & { _id: Types.ObjectId },
    orderId: Types.ObjectId,
    isDuplicateEvent: boolean
  ) {
    const order = await this.ordersService.findByIdOrThrow(String(orderId));
    const wasAlreadyPaid = order.status === 'paid';

    if (wasAlreadyPaid) {
      const assignedCount = await this.ticketsService.countAssignedByRaffle(order.raffleId);
      await this.rafflesService.setSoldTickets(order.raffleId, assignedCount);

      return {
        ok: true,
        status: 'approved',
        orderId: String(order._id),
        idempotent: true
      };
    }

    let ticketNumbers = await this.ticketsService.assignTicketsForOrder(orderId);
    if (ticketNumbers.length === 0) {
      ticketNumbers = await this.ticketsService.listAssignedTicketNumbersForOrder(orderId);
    }

    if (ticketNumbers.length === 0) {
      throw new ConflictException(
        'Approved payment without reserved/assigned tickets. Manual reconciliation required.'
      );
    }

    const paidOrder = await this.ordersService.markPaid(orderId, {
      paymentId: payment._id,
      ticketNumbers
    });

    const assignedCount = await this.ticketsService.countAssignedByRaffle(paidOrder.raffleId);
    await this.rafflesService.setSoldTickets(paidOrder.raffleId, assignedCount);

    try {
      const notificationResult = await this.notificationsService.sendTicketEmail(
        String(paidOrder._id)
      );
      if (notificationResult === 'queued') {
        await this.ordersService.markEmailQueued(paidOrder._id);
      } else {
        await this.ordersService.markEmailSent(paidOrder._id);
      }
    } catch (error) {
      await this.ordersService.markEmailFailed(paidOrder._id);
    }

    await this.auditService.log({
      action: 'payment.approved',
      entityType: 'payment',
      entityId: String(payment._id),
      actorType: 'system',
      actorId: null,
      metadata: {
        provider: 'wompi',
        reference: payment.reference,
        orderId: String(paidOrder._id),
        ticketNumbers
      }
    });

    return {
      ok: true,
      status: 'approved',
      orderId: String(paidOrder._id),
      idempotent: isDuplicateEvent
    };
  }

  private generateIntegrityHash(
    reference: string,
    amountInCents: number,
    currency: string,
    integritySecret: string
  ): string {
    const value = `${reference}${amountInCents}${currency}${integritySecret}`;
    return createHash('sha256').update(value).digest('hex');
  }

  private verifyChecksumOrThrow(payload: WompiWebhookDto, receivedChecksum?: string): void {
    const eventsSecret = this.configService.get<string>('WOMPI_EVENTS_SECRET', '');

    if (!eventsSecret || eventsSecret === 'events_placeholder') {
      return;
    }

    const tx = payload.data?.transaction;
    if (!tx) {
      throw new UnauthorizedException('Invalid transaction payload');
    }

    const payloadChecksum = payload.signature?.checksum ?? receivedChecksum;
    if (!payloadChecksum) {
      throw new UnauthorizedException('Missing checksum in webhook payload');
    }

    const value = `${tx.id}${tx.status}${tx.amount_in_cents}${eventsSecret}`;
    const localChecksum = createHash('sha256').update(value).digest('hex');

    const payloadBuffer = Buffer.from(payloadChecksum);
    const localBuffer = Buffer.from(localChecksum);

    if (payloadBuffer.length !== localBuffer.length) {
      throw new UnauthorizedException('Invalid checksum size');
    }

    if (!timingSafeEqual(payloadBuffer, localBuffer)) {
      throw new UnauthorizedException('Webhook signature validation failed');
    }
  }
}
