import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TicketDocument = HydratedDocument<Ticket>;

@Schema({ timestamps: true })
export class Ticket {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Raffle' })
  raffleId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', default: null, index: true })
  orderId!: Types.ObjectId | null;

  @Prop({ required: true })
  number4d!: string;

  @Prop({ required: true })
  status!: string;

  @Prop({ type: Date, default: null, index: true })
  reservationExpiresAt!: Date | null;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);
TicketSchema.index({ status: 1, reservationExpiresAt: 1 });
