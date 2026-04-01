import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Raffle' })
  raffleId!: Types.ObjectId;

  @Prop({ required: true, trim: true, lowercase: true })
  email!: string;

  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ required: true, trim: true })
  phone!: string;

  @Prop({ required: true })
  ticketQty!: number;

  @Prop({ required: true })
  totalAmount!: number;

  @Prop({ required: true })
  status!: string;

  @Prop({ type: [String], default: [] })
  ticketNumbers!: string[];

  @Prop({ type: Date, default: null })
  expiresAt!: Date | null;

  @Prop({ type: String, default: null })
  failureReason!: string | null;

  @Prop({ type: Date, default: null })
  emailSentAt!: Date | null;

  @Prop({ type: String, default: null })
  emailDeliveryStatus!: 'queued' | 'sent' | 'failed' | null;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ status: 1, expiresAt: 1 });
