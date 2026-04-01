import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrdersService } from '../orders/orders.service';
import { PrizeDrawsService } from '../prize-draws/prize-draws.service';
import { RafflesService } from '../raffles/raffles.service';
import { TicketsService } from '../tickets/tickets.service';
import { PostponeRaffleDto } from './dto/postpone-raffle.dto';
import { SettleDrawDto } from './dto/settle-draw.dto';

@Injectable()
export class DrawsService {
  constructor(
    private readonly rafflesService: RafflesService,
    private readonly prizeDrawsService: PrizeDrawsService,
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
      await this.notificationsService.notifyPostponement(String(updated._id), dto.reason);
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

  async settleDraw(prizeDrawId: string, dto: SettleDrawDto) {
    const prizeDraw = await this.prizeDrawsService.findByIdOrThrow(prizeDrawId);
    const winnerTicket = await this.ticketsService.findEligibleWinnerTicket(
      prizeDraw.raffleId,
      dto.winningNumber
    );

    let winnerOrder = null;
    if (winnerTicket?.orderId) {
      winnerOrder = await this.ordersService.findByIdOrThrow(String(winnerTicket.orderId));
    }

    if (winnerTicket) {
      await this.ticketsService.markTicketAsWinner(winnerTicket._id, prizeDraw._id);
    }

    const updatedPrizeDraw = await this.prizeDrawsService.markAsSettled(prizeDraw._id, {
      winningNumber: dto.winningNumber,
      drawResultSourceUrl: dto.drawResultSourceUrl,
      winningTicketId: winnerTicket?._id ?? null,
      winnerOrderId: winnerOrder?._id ?? null,
      winnerFullNameSnapshot: winnerOrder?.fullName ?? null,
      winnerMaskedEmailSnapshot: winnerOrder ? this.maskEmail(winnerOrder.email) : null
    });

    await this.auditService.log({
      action: 'prize-draw.settled',
      entityType: 'prize-draw',
      entityId: String(updatedPrizeDraw._id),
      actorType: 'admin',
      actorId: null,
      metadata: {
        raffleId: String(updatedPrizeDraw.raffleId),
        winningNumber: dto.winningNumber,
        winnerOrderId: winnerOrder ? String(winnerOrder._id) : null,
        drawResultSourceUrl: dto.drawResultSourceUrl
      }
    });

    return {
      prizeDraw: updatedPrizeDraw,
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

  private maskEmail(email: string): string {
    const [rawLocalPart = '', domain = ''] = email.split('@');
    const localPart = rawLocalPart;
    const visiblePrefix = localPart.slice(0, 2);
    return `${visiblePrefix}${'*'.repeat(Math.max(localPart.length - visiblePrefix.length, 1))}@${domain}`;
  }
}
