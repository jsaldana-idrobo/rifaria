import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { PrizeDrawType, PrizeDrawStatus } from '@rifaria/shared';
import { CreatePrizeDrawDto } from './dto/create-prize-draw.dto';
import { UpdatePrizeDrawDto } from './dto/update-prize-draw.dto';
import { PrizeDraw } from './schemas/prize-draw.schema';

interface LegacyRaffleSnapshot {
  _id: Types.ObjectId;
  prizeName: string;
  prizeImageUrl: string;
  description: string;
  drawAt: Date;
  drawSource: string;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class PrizeDrawsService {
  constructor(@InjectModel(PrizeDraw.name) private readonly prizeDrawModel: Model<PrizeDraw>) {}

  async ensureInitialMajorPrize(raffle: LegacyRaffleSnapshot): Promise<void> {
    const existingCount = await this.prizeDrawModel.countDocuments({ raffleId: raffle._id });
    if (existingCount > 0) {
      return;
    }

    await this.prizeDrawModel.create({
      raffleId: raffle._id,
      title: raffle.prizeName,
      slug: slugify(raffle.prizeName),
      description: raffle.description,
      prizeType: 'other',
      displayValue: raffle.prizeName,
      imageUrl: raffle.prizeImageUrl,
      position: 0,
      drawAt: raffle.drawAt,
      drawSource: raffle.drawSource,
      status: 'scheduled',
      isMajorPrize: true,
      winningNumber: null,
      drawResultSourceUrl: null,
      winningTicketId: null,
      winnerOrderId: null,
      winnerFullNameSnapshot: null,
      winnerMaskedEmailSnapshot: null,
      settledAt: null
    });
  }

  async ensureAndListForRaffle(raffle: LegacyRaffleSnapshot): Promise<PrizeDraw[]> {
    await this.ensureInitialMajorPrize(raffle);

    return this.prizeDrawModel
      .find({ raffleId: raffle._id })
      .sort({ position: 1, drawAt: 1 })
      .lean();
  }

  async listByRaffleId(raffleId: Types.ObjectId): Promise<PrizeDraw[]> {
    return this.prizeDrawModel.find({ raffleId }).sort({ position: 1, drawAt: 1 }).lean();
  }

  async findByIdOrThrow(id: string): Promise<PrizeDraw> {
    const prizeDraw = await this.prizeDrawModel.findById(id);
    if (!prizeDraw) {
      throw new NotFoundException('Prize draw not found');
    }

    return prizeDraw;
  }

  async createForRaffle(raffleId: Types.ObjectId, dto: CreatePrizeDrawDto): Promise<PrizeDraw> {
    const position = await this.prizeDrawModel.countDocuments({ raffleId });

    if (dto.isMajorPrize) {
      await this.clearMajorFlag(raffleId);
    }

    return this.prizeDrawModel.create({
      raffleId,
      title: dto.title,
      slug: slugify(dto.title),
      description: dto.description,
      prizeType: dto.prizeType,
      displayValue: dto.displayValue,
      imageUrl: dto.imageUrl,
      position,
      drawAt: dto.drawAt,
      drawSource: dto.drawSource,
      status: 'scheduled',
      isMajorPrize: dto.isMajorPrize ?? false,
      winningNumber: null,
      drawResultSourceUrl: null,
      winningTicketId: null,
      winnerOrderId: null,
      winnerFullNameSnapshot: null,
      winnerMaskedEmailSnapshot: null,
      settledAt: null
    });
  }

  async updatePrizeDraw(id: string, dto: UpdatePrizeDrawDto): Promise<PrizeDraw> {
    const existing = await this.findByIdOrThrow(id);

    if (existing.status === 'drawn' && dto.drawAt) {
      throw new BadRequestException('Cannot move an already drawn prize draw');
    }

    if (dto.isMajorPrize) {
      await this.clearMajorFlag(existing.raffleId);
    }

    const nextTitle = dto.title ?? existing.title;
    const updated = await this.prizeDrawModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...dto,
          slug: slugify(nextTitle)
        }
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      throw new NotFoundException('Prize draw not found');
    }

    return updated;
  }

  async reorderPrizeDraws(raffleId: Types.ObjectId, orderedIds: string[]): Promise<PrizeDraw[]> {
    const prizeDraws = await this.prizeDrawModel
      .find({ raffleId, _id: { $in: orderedIds.map((id) => new Types.ObjectId(id)) } })
      .lean();

    if (prizeDraws.length !== orderedIds.length) {
      throw new BadRequestException('Ordered ids must belong to the same raffle');
    }

    await Promise.all(
      orderedIds.map((id, position) =>
        this.prizeDrawModel.updateOne({ _id: id, raffleId }, { $set: { position } })
      )
    );

    return this.listByRaffleId(raffleId);
  }

  async markAsSettled(
    prizeDrawId: Types.ObjectId,
    payload: {
      winningNumber: string;
      drawResultSourceUrl: string;
      winningTicketId: Types.ObjectId | null;
      winnerOrderId: Types.ObjectId | null;
      winnerFullNameSnapshot: string | null;
      winnerMaskedEmailSnapshot: string | null;
    }
  ): Promise<PrizeDraw> {
    const updated = await this.prizeDrawModel.findByIdAndUpdate(
      prizeDrawId,
      {
        $set: {
          status: 'drawn' satisfies PrizeDrawStatus,
          winningNumber: payload.winningNumber,
          drawResultSourceUrl: payload.drawResultSourceUrl,
          winningTicketId: payload.winningTicketId,
          winnerOrderId: payload.winnerOrderId,
          winnerFullNameSnapshot: payload.winnerFullNameSnapshot,
          winnerMaskedEmailSnapshot: payload.winnerMaskedEmailSnapshot,
          settledAt: new Date()
        }
      },
      { new: true }
    );

    if (!updated) {
      throw new NotFoundException('Prize draw not found');
    }

    return updated;
  }

  async cancelPrizeDraw(id: string): Promise<PrizeDraw> {
    const prizeDraw = await this.findByIdOrThrow(id);
    if (prizeDraw.status === 'drawn') {
      throw new BadRequestException('Cannot cancel an already drawn prize draw');
    }

    const updated = await this.prizeDrawModel.findByIdAndUpdate(
      id,
      { $set: { status: 'cancelled' satisfies PrizeDrawStatus } },
      { new: true }
    );

    if (!updated) {
      throw new NotFoundException('Prize draw not found');
    }

    return updated;
  }

  private async clearMajorFlag(raffleId: Types.ObjectId): Promise<void> {
    await this.prizeDrawModel.updateMany(
      { raffleId, isMajorPrize: true },
      { $set: { isMajorPrize: false } }
    );
  }
}
