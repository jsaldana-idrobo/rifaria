import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { TICKET_PRICE_COP } from '@rifaria/shared';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { Order } from '../orders/schemas/order.schema';
import { OrdersService } from '../orders/orders.service';
import { Payment } from '../payments-wompi/schemas/payment.schema';
import { PaymentsWompiService } from '../payments-wompi/payments-wompi.service';
import { CreatePrizeDrawDto } from '../prize-draws/dto/create-prize-draw.dto';
import { ReorderPrizeDrawsDto } from '../prize-draws/dto/reorder-prize-draws.dto';
import { UpdatePrizeDrawDto } from '../prize-draws/dto/update-prize-draw.dto';
import { PrizeDrawsService } from '../prize-draws/prize-draws.service';
import { RafflesService } from '../raffles/raffles.service';
import { UpdateRaffleDto } from '../raffles/dto/update-raffle.dto';
import { Ticket } from '../tickets/schemas/ticket.schema';

@Injectable()
export class AdminService {
  constructor(
    private readonly rafflesService: RafflesService,
    private readonly prizeDrawsService: PrizeDrawsService,
    private readonly ordersService: OrdersService,
    private readonly paymentsWompiService: PaymentsWompiService,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
    @InjectModel(Ticket.name) private readonly ticketModel: Model<Ticket>
  ) {}

  async getDashboard() {
    const raffle = await this.rafflesService.getActiveRaffleForSales();
    const prizeDraws = await this.prizeDrawsService.ensureAndListForRaffle({
      _id: raffle._id,
      prizeName: raffle.prizeName,
      prizeImageUrl: raffle.prizeImageUrl,
      description: raffle.description,
      drawAt: raffle.drawAt,
      drawSource: raffle.drawSource
    });

    const [orderCounts, paymentCounts, reservedTickets, assignedTickets, wonTickets, buyers] =
      await Promise.all([
        this.orderModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        this.paymentModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        this.ticketModel.countDocuments({ raffleId: raffle._id, status: 'reserved' }),
        this.ticketModel.countDocuments({ raffleId: raffle._id, status: 'assigned' }),
        this.ticketModel.countDocuments({
          raffleId: raffle._id,
          status: 'assigned',
          wonPrizeDrawId: { $ne: null }
        }),
        this.orderModel.countDocuments({ raffleId: raffle._id, status: 'paid' })
      ]);

    const progress = raffle.totalTickets > 0 ? raffle.soldTickets / raffle.totalTickets : 0;
    const nextScheduledPrize = prizeDraws.find((draw) => draw.status === 'scheduled') ?? null;
    const availableTickets = Math.max(
      raffle.totalTickets - raffle.soldTickets - reservedTickets,
      0
    );

    return {
      raffle: {
        id: String(raffle._id),
        title: raffle.title,
        prizeName: raffle.prizeName,
        status: raffle.status,
        soldTickets: raffle.soldTickets,
        totalTickets: raffle.totalTickets,
        progress,
        grossRevenueCop: raffle.soldTickets * TICKET_PRICE_COP,
        drawAt: raffle.drawAt,
        drawSource: raffle.drawSource,
        reservedTickets,
        assignedTickets,
        wonTickets,
        availableTickets,
        buyers,
        nextScheduledPrize: nextScheduledPrize
          ? {
              id: String(nextScheduledPrize._id),
              title: nextScheduledPrize.title,
              drawAt: nextScheduledPrize.drawAt,
              displayValue: nextScheduledPrize.displayValue
            }
          : null
      },
      prizeDraws,
      orderCounts,
      paymentCounts
    };
  }

  async listOrders(limit = 100) {
    return this.ordersService.listLatest(limit);
  }

  async listPayments(limit = 100) {
    return this.paymentsWompiService.listLatest(limit);
  }

  async listUsers(limit = 100) {
    return this.authService.listUsers(limit);
  }

  async listPrizeDraws() {
    const raffle = await this.rafflesService.getActiveRaffleForSales();
    return this.prizeDrawsService.ensureAndListForRaffle({
      _id: raffle._id,
      prizeName: raffle.prizeName,
      prizeImageUrl: raffle.prizeImageUrl,
      description: raffle.description,
      drawAt: raffle.drawAt,
      drawSource: raffle.drawSource
    });
  }

  async createPrizeDraw(dto: CreatePrizeDrawDto) {
    const raffle = await this.rafflesService.getActiveRaffleForSales();
    const created = await this.prizeDrawsService.createForRaffle(raffle._id, dto);

    await this.auditService.log({
      action: 'prize-draw.created',
      entityType: 'prize-draw',
      entityId: String(created._id),
      actorType: 'admin',
      actorId: null,
      metadata: {
        raffleId: String(raffle._id),
        title: created.title
      }
    });

    return created;
  }

  async updatePrizeDraw(id: string, dto: UpdatePrizeDrawDto) {
    const updated = await this.prizeDrawsService.updatePrizeDraw(id, dto);

    await this.auditService.log({
      action: 'prize-draw.updated',
      entityType: 'prize-draw',
      entityId: String(updated._id),
      actorType: 'admin',
      actorId: null,
      metadata: { ...dto }
    });

    return updated;
  }

  async reorderPrizeDraws(dto: ReorderPrizeDrawsDto) {
    const raffle = await this.rafflesService.getActiveRaffleForSales();
    const reordered = await this.prizeDrawsService.reorderPrizeDraws(raffle._id, dto.orderedIds);

    await this.auditService.log({
      action: 'prize-draw.reordered',
      entityType: 'raffle',
      entityId: String(raffle._id),
      actorType: 'admin',
      actorId: null,
      metadata: {
        orderedIds: dto.orderedIds
      }
    });

    return reordered;
  }

  async cancelPrizeDraw(id: string) {
    const cancelled = await this.prizeDrawsService.cancelPrizeDraw(id);

    await this.auditService.log({
      action: 'prize-draw.cancelled',
      entityType: 'prize-draw',
      entityId: String(cancelled._id),
      actorType: 'admin',
      actorId: null,
      metadata: {
        raffleId: String(cancelled.raffleId)
      }
    });

    return cancelled;
  }

  async listBuyers(limit = 100) {
    const raffle = await this.rafflesService.getActiveRaffleForSales();
    return this.orderModel
      .find({ raffleId: raffle._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async listTicketInventory(search?: string, limit = 100) {
    const raffle = await this.rafflesService.getActiveRaffleForSales();
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const pipeline: PipelineStage[] = [
      {
        $match: {
          raffleId: raffle._id
        }
      },
      {
        $lookup: {
          from: 'orders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'order'
        }
      },
      {
        $unwind: {
          path: '$order',
          preserveNullAndEmptyArrays: true
        }
      }
    ];

    if (search && search.trim().length > 0) {
      const searchText = search.trim();
      const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const orConditions: Array<Record<string, unknown>> = [
        { number4d: searchText },
        { 'order.email': regex },
        { 'order.phone': regex }
      ];

      if (Types.ObjectId.isValid(searchText)) {
        orConditions.push({ orderId: new Types.ObjectId(searchText) });
      }

      pipeline.push({
        $match: {
          $or: orConditions
        }
      });
    }

    pipeline.push(
      {
        $sort: {
          assignedAt: -1,
          createdAt: -1
        }
      },
      {
        $limit: safeLimit
      },
      {
        $project: {
          number4d: 1,
          status: 1,
          reservationExpiresAt: 1,
          assignedAt: 1,
          wonPrizeDrawId: 1,
          orderId: 1,
          buyer: {
            fullName: '$order.fullName',
            email: '$order.email',
            phone: '$order.phone',
            status: '$order.status',
            emailDeliveryStatus: '$order.emailDeliveryStatus'
          }
        }
      }
    );

    const [rows, reservedCount, assignedCount, wonCount] = await Promise.all([
      this.ticketModel.aggregate(pipeline).exec(),
      this.ticketModel.countDocuments({ raffleId: raffle._id, status: 'reserved' }),
      this.ticketModel.countDocuments({ raffleId: raffle._id, status: 'assigned' }),
      this.ticketModel.countDocuments({
        raffleId: raffle._id,
        status: 'assigned',
        wonPrizeDrawId: { $ne: null }
      })
    ]);

    return {
      summary: {
        totalTickets: raffle.totalTickets,
        availableTickets: Math.max(raffle.totalTickets - raffle.soldTickets - reservedCount, 0),
        reservedTickets: reservedCount,
        assignedTickets: assignedCount,
        wonTickets: wonCount
      },
      rows
    };
  }

  async updateRaffle(raffleId: string, dto: UpdateRaffleDto) {
    return this.rafflesService.updateRaffle(raffleId, dto);
  }
}
