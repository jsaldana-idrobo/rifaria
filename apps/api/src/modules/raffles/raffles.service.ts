import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import type { RaffleStatus } from '@rifaria/shared';
import { PrizeDrawsService } from '../prize-draws/prize-draws.service';
import type { PrizeDraw } from '../prize-draws/schemas/prize-draw.schema';
import { Raffle } from './schemas/raffle.schema';
import { UpdateRaffleDto } from './dto/update-raffle.dto';

export interface PublicPrizeDrawSummary {
  id: string;
  title: string;
  description: string;
  prizeType: string;
  displayValue: string;
  imageUrl: string;
  drawAt: Date;
  drawSource: string;
  status: string;
  isMajorPrize: boolean;
  winningNumber: string | null;
  proofUrl: string | null;
  winnerLabel: string | null;
}

export interface PublicRaffleCampaign {
  _id: string;
  title: string;
  description: string;
  prizeName: string;
  prizeImageUrl: string;
  drawAt: Date;
  drawSource: string;
  totalTickets: number;
  soldTickets: number;
  status: string;
  featuredPrize: PublicPrizeDrawSummary | null;
  upcomingPrizeDraws: PublicPrizeDrawSummary[];
  completedPrizeDraws: PublicPrizeDrawSummary[];
}

@Injectable()
export class RafflesService {
  constructor(
    @InjectModel(Raffle.name) private readonly raffleModel: Model<Raffle>,
    private readonly prizeDrawsService: PrizeDrawsService
  ) {}

  async getActivePublicRaffle(): Promise<PublicRaffleCampaign> {
    const raffle = await this.getActiveRaffleForSales();
    const prizeDraws = await this.prizeDrawsService.ensureAndListForRaffle(
      this.toLegacySnapshot(raffle)
    );
    const featuredPrize = prizeDraws.find((draw) => draw.isMajorPrize) ?? prizeDraws[0] ?? null;

    return {
      _id: String(raffle._id),
      title: raffle.title,
      description: raffle.description,
      prizeName: featuredPrize?.displayValue ?? raffle.prizeName,
      prizeImageUrl: featuredPrize?.imageUrl ?? raffle.prizeImageUrl,
      drawAt: featuredPrize?.drawAt ?? raffle.drawAt,
      drawSource: featuredPrize?.drawSource ?? raffle.drawSource,
      totalTickets: raffle.totalTickets,
      soldTickets: raffle.soldTickets,
      status: raffle.status,
      featuredPrize: featuredPrize ? this.serializePrizeDraw(featuredPrize) : null,
      upcomingPrizeDraws: prizeDraws
        .filter((draw) => draw.status === 'scheduled')
        .map((draw) => this.serializePrizeDraw(draw)),
      completedPrizeDraws: prizeDraws
        .filter((draw) => draw.status === 'drawn')
        .map((draw) => this.serializePrizeDraw(draw))
    };
  }

  async getRaffleByIdOrThrow(raffleId: string): Promise<Raffle> {
    const raffle = await this.raffleModel.findById(raffleId);
    if (!raffle) {
      throw new NotFoundException('Raffle not found');
    }

    return raffle;
  }

  async getActiveRaffleForSales(): Promise<Raffle> {
    const raffle = await this.raffleModel.findOne({ status: { $in: ['selling', 'postponed'] } });
    if (!raffle) {
      throw new NotFoundException('There is no raffle available for sales');
    }

    return raffle;
  }

  async updateRaffle(raffleId: string, dto: UpdateRaffleDto): Promise<Raffle> {
    const current = await this.getRaffleByIdOrThrow(raffleId);

    if (dto.status === 'selling' && current.status !== 'selling') {
      await this.assertSingleSellingRaffle(current._id);
    }

    const updated = await this.raffleModel.findByIdAndUpdate(raffleId, dto, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      throw new NotFoundException('Raffle not found');
    }

    return updated;
  }

  async incrementSoldTickets(raffleId: Types.ObjectId, amount: number): Promise<void> {
    await this.raffleModel.updateOne({ _id: raffleId }, { $inc: { soldTickets: amount } });
  }

  async setSoldTickets(raffleId: Types.ObjectId, soldTickets: number): Promise<void> {
    await this.raffleModel.updateOne({ _id: raffleId }, { $set: { soldTickets } });
  }

  async setStatus(raffleId: Types.ObjectId, status: RaffleStatus): Promise<void> {
    await this.raffleModel.updateOne({ _id: raffleId }, { $set: { status } });
  }

  async postponeRaffle(
    raffleId: string,
    payload: { newDrawAt: Date; reason: string }
  ): Promise<Raffle> {
    const raffle = await this.getRaffleByIdOrThrow(raffleId);

    const updated = await this.raffleModel.findByIdAndUpdate(
      raffle._id,
      {
        $set: {
          drawAt: payload.newDrawAt,
          status: 'postponed'
        },
        $push: {
          postponements: {
            previousDrawAt: raffle.drawAt,
            newDrawAt: payload.newDrawAt,
            reason: payload.reason,
            changedAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!updated) {
      throw new NotFoundException('Raffle not found');
    }

    return updated;
  }

  async settleDraw(
    raffleId: string,
    payload: { winningNumber: string; drawResultSourceUrl: string }
  ): Promise<Raffle> {
    const raffle = await this.getRaffleByIdOrThrow(raffleId);

    const updated = await this.raffleModel.findByIdAndUpdate(
      raffle._id,
      {
        $set: {
          winningNumber: payload.winningNumber,
          status: 'drawn'
        },
        $push: {
          postponements: {
            previousDrawAt: raffle.drawAt,
            newDrawAt: raffle.drawAt,
            reason: `Result source: ${payload.drawResultSourceUrl}`,
            changedAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!updated) {
      throw new NotFoundException('Raffle not found');
    }

    return updated;
  }

  async createDraftIfNoneExists(): Promise<Raffle> {
    const existing = await this.raffleModel.findOne().sort({ createdAt: -1 });
    if (existing) {
      return existing;
    }

    return this.raffleModel.create({
      title: 'Rifa de lanzamiento Rifaria',
      slug: 'rifa-lanzamiento-rifaria',
      description:
        'Participa comprando tus boletas y recibe tus numeros por correo. Rifa oficial con sorteo referenciado en loteria colombiana.',
      prizeName: 'Moto de lanzamiento',
      prizeImageUrl:
        'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80',
      startAt: new Date(),
      endAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20),
      drawAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
      drawSource: 'Loteria de Medellin - ultimo resultado del dia',
      totalTickets: 10000,
      soldTickets: 0,
      status: 'selling',
      galleryImages: []
    });
  }

  async getUpcomingPrizeDrawSummaries(raffleId: Types.ObjectId): Promise<PublicPrizeDrawSummary[]> {
    const raffle = await this.getRaffleByIdOrThrow(String(raffleId));
    const prizeDraws = await this.prizeDrawsService.ensureAndListForRaffle(
      this.toLegacySnapshot(raffle)
    );

    return prizeDraws
      .filter((draw) => draw.status === 'scheduled')
      .map((draw) => this.serializePrizeDraw(draw));
  }

  private async assertSingleSellingRaffle(currentRaffleId?: Types.ObjectId): Promise<void> {
    const filter: FilterQuery<Raffle> = { status: 'selling' };

    if (currentRaffleId) {
      filter._id = { $ne: currentRaffleId };
    }

    const anotherSelling = await this.raffleModel.exists(filter);
    if (anotherSelling) {
      throw new ConflictException('Only one raffle can be selling at a time');
    }
  }

  private serializePrizeDraw(draw: PrizeDraw): PublicPrizeDrawSummary {
    const firstName = draw.winnerFullNameSnapshot?.split(/\s+/)[0] ?? null;
    let winnerLabel: string | null = null;

    if (firstName !== null) {
      winnerLabel = draw.winnerMaskedEmailSnapshot
        ? `${firstName} | ${draw.winnerMaskedEmailSnapshot}`
        : firstName;
    }

    return {
      id: String(draw._id),
      title: draw.title,
      description: draw.description,
      prizeType: draw.prizeType,
      displayValue: draw.displayValue,
      imageUrl: draw.imageUrl,
      drawAt: draw.drawAt,
      drawSource: draw.drawSource,
      status: draw.status,
      isMajorPrize: draw.isMajorPrize,
      winningNumber: draw.winningNumber,
      proofUrl: draw.drawResultSourceUrl,
      winnerLabel
    };
  }

  private toLegacySnapshot(raffle: Raffle) {
    return {
      _id: raffle._id,
      prizeName: raffle.prizeName,
      prizeImageUrl: raffle.prizeImageUrl,
      description: raffle.description,
      drawAt: raffle.drawAt,
      drawSource: raffle.drawSource
    };
  }
}
