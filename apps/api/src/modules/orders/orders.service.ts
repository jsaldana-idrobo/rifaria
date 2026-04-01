import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  DEFAULT_RESERVATION_MINUTES,
  assertOrderTransition,
  computeOrderTotal,
  type OrderStatus
} from '@rifaria/shared';
import { AuditService } from '../audit/audit.service';
import { RafflesService } from '../raffles/raffles.service';
import { TicketsService } from '../tickets/tickets.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './schemas/order.schema';

export interface PublicOrderStatus {
  id: string;
  status: OrderStatus;
  ticketQty: number;
  totalAmount: number;
  ticketNumbers: string[];
  upcomingPrizeDraws: Array<{
    id: string;
    title: string;
    displayValue: string;
    drawAt: Date;
    drawSource: string;
    status: string;
    isMajorPrize: boolean;
  }>;
  expiresAt: Date | null;
  failureReason: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    private readonly rafflesService: RafflesService,
    private readonly ticketsService: TicketsService,
    private readonly auditService: AuditService
  ) {}

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const raffle = await this.rafflesService.getActiveRaffleForSales();
    const raffleId = raffle._id;

    const reservedCount = await this.ticketsService.countReservedByRaffle(raffleId);
    if (raffle.soldTickets + reservedCount + dto.ticketQty > raffle.totalTickets) {
      throw new BadRequestException('Not enough tickets available for this raffle');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + DEFAULT_RESERVATION_MINUTES * 60 * 1000);
    const session = await this.orderModel.db.startSession();

    try {
      session.startTransaction();

      const createdOrder = new this.orderModel({
        raffleId,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        ticketQty: dto.ticketQty,
        totalAmount: computeOrderTotal(dto.ticketQty),
        status: 'initiated',
        ticketNumbers: [],
        paymentId: null,
        expiresAt,
        failureReason: null
      });
      await createdOrder.save({ session });

      const reservedTickets = await this.ticketsService.reserveTicketsForOrder({
        raffleId,
        orderId: createdOrder._id as Types.ObjectId,
        ticketQty: dto.ticketQty,
        expiresAt,
        session
      });

      assertOrderTransition(createdOrder.status, 'pending_payment');
      createdOrder.status = 'pending_payment';
      createdOrder.ticketNumbers = reservedTickets;
      createdOrder.expiresAt = expiresAt;
      await createdOrder.save({ session });

      await session.commitTransaction();

      await this.auditService.log({
        action: 'order.created',
        entityType: 'order',
        entityId: String(createdOrder._id),
        actorType: 'user',
        actorId: dto.email,
        metadata: {
          raffleId: String(raffleId),
          ticketQty: dto.ticketQty,
          ticketNumbers: reservedTickets
        }
      });

      return createdOrder;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async findByIdOrThrow(orderId: string): Promise<Order> {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async findPublicStatusByIdOrThrow(orderId: string): Promise<PublicOrderStatus> {
    const order = await this.findByIdOrThrow(orderId);

    const ticketNumbers = order.status === 'paid' ? order.ticketNumbers : [];
    const upcomingPrizeDraws =
      order.status === 'paid'
        ? (await this.rafflesService.getUpcomingPrizeDrawSummaries(order.raffleId)).map((draw) => ({
            id: draw.id,
            title: draw.title,
            displayValue: draw.displayValue,
            drawAt: draw.drawAt,
            drawSource: draw.drawSource,
            status: draw.status,
            isMajorPrize: draw.isMajorPrize
          }))
        : [];

    return {
      id: String(order._id),
      status: order.status,
      ticketQty: order.ticketQty,
      totalAmount: order.totalAmount,
      ticketNumbers,
      upcomingPrizeDraws,
      expiresAt: order.expiresAt,
      failureReason: order.failureReason,
      createdAt:
        ('createdAt' in order ? (order as unknown as { createdAt?: Date }).createdAt : null) ??
        null,
      updatedAt:
        ('updatedAt' in order ? (order as unknown as { updatedAt?: Date }).updatedAt : null) ?? null
    };
  }

  async listLatest(limit = 100): Promise<Order[]> {
    return this.orderModel.find().sort({ createdAt: -1 }).limit(limit).lean();
  }

  async markPaid(
    orderId: Types.ObjectId,
    payload: { paymentId: Types.ObjectId; ticketNumbers: string[] }
  ): Promise<Order> {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'paid') {
      assertOrderTransition(order.status, 'paid');
      order.status = 'paid';
    }

    order.paymentId = payload.paymentId;
    order.ticketNumbers = payload.ticketNumbers;
    order.failureReason = null;

    await order.save();

    return order;
  }

  async markFailed(
    orderId: Types.ObjectId,
    status: Extract<OrderStatus, 'failed' | 'expired'>,
    reason: string
  ): Promise<Order> {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (['failed', 'expired'].includes(order.status)) {
      order.failureReason = reason;
      await order.save();
      return order;
    }

    if (order.status !== status) {
      assertOrderTransition(order.status, status);
      order.status = status;
    }

    order.failureReason = reason;
    await order.save();

    return order;
  }

  async markEmailQueued(orderId: Types.ObjectId): Promise<void> {
    await this.orderModel.updateOne(
      { _id: orderId },
      {
        $set: {
          emailDeliveryStatus: 'queued'
        }
      }
    );
  }

  async markEmailFailed(orderId: Types.ObjectId): Promise<void> {
    await this.orderModel.updateOne(
      { _id: orderId },
      {
        $set: {
          emailDeliveryStatus: 'failed'
        }
      }
    );
  }

  async expirePendingOrders(now = new Date()): Promise<number> {
    const expiredOrders = await this.orderModel
      .find({
        status: 'pending_payment',
        expiresAt: { $lte: now }
      })
      .lean();

    if (expiredOrders.length === 0) {
      return 0;
    }

    for (const order of expiredOrders) {
      await this.orderModel.updateOne(
        { _id: order._id, status: 'pending_payment' },
        {
          $set: {
            status: 'expired',
            failureReason: 'Reservation expired before payment confirmation'
          }
        }
      );

      await this.ticketsService.releaseTicketsForOrder(order._id as Types.ObjectId);
    }

    return expiredOrders.length;
  }
}
