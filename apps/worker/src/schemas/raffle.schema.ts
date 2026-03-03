import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RaffleDocument = HydratedDocument<Raffle>;

@Schema({ timestamps: true })
export class Raffle {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  prizeName!: string;

  @Prop({ required: true })
  drawAt!: Date;

  @Prop({ required: true })
  drawSource!: string;

  @Prop({ required: true })
  status!: string;
}

export const RaffleSchema = SchemaFactory.createForClass(Raffle);
