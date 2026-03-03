import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrdersService } from '../orders/orders.service';
import { RafflesService } from '../raffles/raffles.service';
import { TicketsService } from '../tickets/tickets.service';
import { PostponeRaffleDto } from './dto/postpone-raffle.dto';
import { SettleDrawDto } from './dto/settle-draw.dto';

@Injectable()
export class DrawsService {
  constructor(
    private readonly rafflesService: RafflesService,
    private readonly ticketsService: TicketsService,
    private readonly notificationsService: NotificationsService,
    private readonly ordersService: OrdersService,
    private readonly auditService: AuditService
  ) {}

  async postponeRaffle(raffleId: string, dto: PostponeRaffleDto) {
    const updated = await this.rafflesService.postponeRaffle(raffleId, {
      newDrawAt: dto.newDrawAt,
      reason: dto.reason
    });

    if (dto.notifyParticipants) {
      await this.notificationsService.enqueuePostponement(String(updated._id), dto.reason);
    }

    await this.auditService.log({
      action: 'raffle.postponed',
      entityType: 'raffle',
      entityId: String(updated._id),
      actorType: 'admin',
      actorId: null,
      metadata: {
        newDrawAt: dto.newDrawAt.toISOString(),
        reason: dto.reason,
        notifyParticipants: dto.notifyParticipants
      }
    });

    return updated;
  }

  async settleDraw(raffleId: string, dto: SettleDrawDto) {
    const updatedRaffle = await this.rafflesService.settleDraw(raffleId, dto);
    const winnerTicket = await this.ticketsService.findWinnerTicket(
      updatedRaffle._id as Types.ObjectId,
      dto.winningNumber
    );

    let winnerOrder = null;
    if (winnerTicket?.orderId) {
      winnerOrder = await this.ordersService.findByIdOrThrow(String(winnerTicket.orderId));
    }

    await this.auditService.log({
      action: 'draw.settled',
      entityType: 'raffle',
      entityId: String(updatedRaffle._id),
      actorType: 'admin',
      actorId: null,
      metadata: {
        winningNumber: dto.winningNumber,
        winnerOrderId: winnerOrder ? String(winnerOrder._id) : null,
        drawResultSourceUrl: dto.drawResultSourceUrl
      }
    });

    return {
      raffle: updatedRaffle,
      winningNumber: dto.winningNumber,
      winner: winnerOrder
        ? {
            orderId: String(winnerOrder._id),
            fullName: winnerOrder.fullName,
            email: winnerOrder.email,
            phone: winnerOrder.phone
          }
        : null
    };
  }
}
