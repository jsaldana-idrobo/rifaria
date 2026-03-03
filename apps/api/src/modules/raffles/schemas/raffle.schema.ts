import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { raffleStatuses, type RaffleStatus } from '@rifaria/shared';

export type RaffleDocument = HydratedDocument<Raffle>;

@Schema({ timestamps: true })
export class Raffle {
  _id!: Types.ObjectId;

  @Prop({ required: true, trim: true, minlength: 3, maxlength: 140 })
  title!: string;

  @Prop({ required: true, trim: true, unique: true, lowercase: true })
  slug!: string;

  @Prop({ required: true, trim: true, minlength: 10, maxlength: 2000 })
  description!: string;

  @Prop({ required: true, trim: true })
  prizeName!: string;

  @Prop({ required: true, trim: true })
  prizeImageUrl!: string;

  @Prop({ required: true })
  startAt!: Date;

  @Prop({ required: true })
  endAt!: Date;

  @Prop({ required: true })
  drawAt!: Date;

  @Prop({ required: true, trim: true })
  drawSource!: string;

  @Prop({ required: true, min: 1, max: 10000, default: 10000 })
  totalTickets!: number;

  @Prop({ required: true, min: 0, max: 10000, default: 0 })
  soldTickets!: number;

  @Prop({ type: String, enum: raffleStatuses, default: 'draft' })
  status!: RaffleStatus;

  @Prop({ type: [String], default: [] })
  galleryImages!: string[];

  @Prop({
    type: [
      {
        previousDrawAt: { type: Date, required: true },
        newDrawAt: { type: Date, required: true },
        reason: { type: String, required: true },
        changedAt: { type: Date, required: true }
      }
    ],
    default: []
  })
  postponements!: Array<{
    previousDrawAt: Date;
    newDrawAt: Date;
    reason: string;
    changedAt: Date;
  }>;

  @Prop({ type: String, default: null })
  winningNumber!: string | null;
}

export const RaffleSchema = SchemaFactory.createForClass(Raffle);
RaffleSchema.index({ status: 1, drawAt: 1 });
RaffleSchema.index({ status: 1 }, { unique: true, partialFilterExpression: { status: 'selling' } });
