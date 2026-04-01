import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PrizeDrawDocument = HydratedDocument<PrizeDraw>;

@Schema({ timestamps: true })
export class PrizeDraw {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Raffle', index: true })
  raffleId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  displayValue!: string;

  @Prop({ required: true })
  drawAt!: Date;

  @Prop({ required: true, trim: true })
  drawSource!: string;

  @Prop({ required: true })
  status!: string;
}

export const PrizeDrawSchema = SchemaFactory.createForClass(PrizeDraw);
PrizeDrawSchema.index({ raffleId: 1, status: 1, drawAt: 1 });
