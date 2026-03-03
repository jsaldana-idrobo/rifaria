import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import type { RaffleStatus } from '@rifaria/shared';
import { Raffle } from './schemas/raffle.schema';
import { UpdateRaffleDto } from './dto/update-raffle.dto';

@Injectable()
export class RafflesService {
  constructor(@InjectModel(Raffle.name) private readonly raffleModel: Model<Raffle>) {}

  async getActivePublicRaffle(): Promise<Raffle> {
    const raffle = await this.raffleModel
      .findOne({ status: { $in: ['selling', 'postponed'] } })
      .sort({ updatedAt: -1 })
      .lean();

    if (!raffle) {
      throw new NotFoundException('No active raffle found');
    }

    return raffle as unknown as Raffle;
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
      await this.assertSingleSellingRaffle(current._id as Types.ObjectId);
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
}
