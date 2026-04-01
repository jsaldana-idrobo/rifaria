import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  prizeDrawStatuses,
  prizeDrawTypes,
  type PrizeDrawStatus,
  type PrizeDrawType
} from '@rifaria/shared';

export type PrizeDrawDocument = HydratedDocument<PrizeDraw>;

@Schema({ timestamps: true })
export class PrizeDraw {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Raffle', index: true })
  raffleId!: Types.ObjectId;

  @Prop({ required: true, trim: true, minlength: 3, maxlength: 140 })
  title!: string;

  @Prop({ required: true, trim: true, lowercase: true })
  slug!: string;

  @Prop({ required: true, trim: true, minlength: 10, maxlength: 1200 })
  description!: string;

  @Prop({ type: String, enum: prizeDrawTypes, required: true })
  prizeType!: PrizeDrawType;

  @Prop({ required: true, trim: true, minlength: 2, maxlength: 140 })
  displayValue!: string;

  @Prop({ required: true, trim: true })
  imageUrl!: string;

  @Prop({ required: true, min: 0 })
  position!: number;

  @Prop({ required: true })
  drawAt!: Date;

  @Prop({ required: true, trim: true, minlength: 3, maxlength: 200 })
  drawSource!: string;

  @Prop({ type: String, enum: prizeDrawStatuses, default: 'scheduled' })
  status!: PrizeDrawStatus;

  @Prop({ type: Boolean, default: false })
  isMajorPrize!: boolean;

  @Prop({ type: String, default: null })
  winningNumber!: string | null;

  @Prop({ type: String, default: null })
  drawResultSourceUrl!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'Ticket', default: null })
  winningTicketId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Order', default: null })
  winnerOrderId!: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  winnerFullNameSnapshot!: string | null;

  @Prop({ type: String, default: null })
  winnerMaskedEmailSnapshot!: string | null;

  @Prop({ type: Date, default: null })
  settledAt!: Date | null;
}

export const PrizeDrawSchema = SchemaFactory.createForClass(PrizeDraw);
PrizeDrawSchema.index({ raffleId: 1, position: 1 });
PrizeDrawSchema.index({ raffleId: 1, slug: 1 }, { unique: true });
PrizeDrawSchema.index({ raffleId: 1, status: 1, drawAt: 1 });
