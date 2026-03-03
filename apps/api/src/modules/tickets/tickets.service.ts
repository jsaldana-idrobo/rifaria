import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { randomTicketNumber } from '@rifaria/shared';
import { Ticket } from './schemas/ticket.schema';

interface ReserveTicketsInput {
  raffleId: Types.ObjectId;
  orderId: Types.ObjectId;
  ticketQty: number;
  expiresAt: Date;
  session?: ClientSession;
}

function sortTicketNumbers(ticketNumbers: string[]): string[] {
  return ticketNumbers.sort((left, right) => left.localeCompare(right, 'es-CO'));
}

@Injectable()
export class TicketsService {
  constructor(@InjectModel(Ticket.name) private readonly ticketModel: Model<Ticket>) {}

  async reserveTicketsForOrder(input: ReserveTicketsInput): Promise<string[]> {
    const reserved: string[] = [];
    const maxAttempts = input.ticketQty * 500;
    let attempts = 0;

    while (reserved.length < input.ticketQty && attempts < maxAttempts) {
      attempts += 1;
      const number4d = randomTicketNumber();

      if (reserved.includes(number4d)) {
        continue;
      }

      try {
        await this.ticketModel.create(
          [
            {
              raffleId: input.raffleId,
              orderId: input.orderId,
              number4d,
              status: 'reserved',
              reservationExpiresAt: input.expiresAt,
              assignedAt: null
            }
          ],
          input.session ? { session: input.session } : undefined
        );

        reserved.push(number4d);
      } catch (error) {
        if (this.isDuplicateKeyError(error)) {
          continue;
        }

        throw error;
      }
    }

    if (reserved.length < input.ticketQty) {
      throw new ConflictException(
        'Could not reserve enough unique tickets. Try with a smaller quantity or later.'
      );
    }

    return sortTicketNumbers(reserved);
  }

  async assignTicketsForOrder(orderId: Types.ObjectId, session?: ClientSession): Promise<string[]> {
    const tickets = await this.ticketModel.find({
      orderId,
      status: 'reserved'
    });

    if (tickets.length === 0) {
      return [];
    }

    const ticketIds = tickets.map((ticket) => ticket._id);

    await this.ticketModel.updateMany(
      {
        _id: { $in: ticketIds },
        status: 'reserved'
      },
      {
        $set: {
          status: 'assigned',
          reservationExpiresAt: null,
          assignedAt: new Date()
        }
      },
      session ? { session } : undefined
    );

    return sortTicketNumbers(tickets.map((ticket) => ticket.number4d));
  }

  async releaseTicketsForOrder(orderId: Types.ObjectId, session?: ClientSession): Promise<number> {
    const result = await this.ticketModel.deleteMany(
      {
        orderId,
        status: 'reserved'
      },
      session ? { session } : undefined
    );

    return result.deletedCount ?? 0;
  }

  async releaseExpiredReservations(now = new Date()): Promise<number> {
    const result = await this.ticketModel.deleteMany({
      status: 'reserved',
      reservationExpiresAt: { $lte: now }
    });

    return result.deletedCount ?? 0;
  }

  async findWinnerTicket(raffleId: Types.ObjectId, winningNumber: string): Promise<Ticket | null> {
    return this.ticketModel
      .findOne({ raffleId, number4d: winningNumber, status: 'assigned' })
      .lean();
  }

  async listAssignedTicketNumbersForOrder(orderId: Types.ObjectId): Promise<string[]> {
    const assignedTickets = await this.ticketModel
      .find(
        {
          orderId,
          status: 'assigned'
        },
        {
          number4d: 1
        }
      )
      .lean();

    return sortTicketNumbers(assignedTickets.map((ticket) => ticket.number4d));
  }

  async countReservedByRaffle(raffleId: Types.ObjectId): Promise<number> {
    return this.ticketModel.countDocuments({
      raffleId,
      status: 'reserved'
    });
  }

  async countAssignedByRaffle(raffleId: Types.ObjectId): Promise<number> {
    return this.ticketModel.countDocuments({
      raffleId,
      status: 'assigned'
    });
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    );
  }
}
