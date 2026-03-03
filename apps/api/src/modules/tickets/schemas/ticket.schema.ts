import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ticketStatuses, type TicketStatus } from '@rifaria/shared';

export type TicketDocument = HydratedDocument<Ticket>;

@Schema({ timestamps: true })
export class Ticket {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Raffle', index: true })
  raffleId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', default: null, index: true })
  orderId!: Types.ObjectId | null;

  @Prop({ required: true, match: /^\d{4}$/ })
  number4d!: string;

  @Prop({ type: String, enum: ticketStatuses, default: 'reserved' })
  status!: TicketStatus;

  @Prop({ type: Date, default: null, index: true })
  reservationExpiresAt!: Date | null;

  @Prop({ type: Date, default: null })
  assignedAt!: Date | null;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);
TicketSchema.index({ raffleId: 1, number4d: 1 }, { unique: true });
TicketSchema.index({ status: 1, reservationExpiresAt: 1 });
