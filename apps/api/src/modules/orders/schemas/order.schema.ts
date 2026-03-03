import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { orderStatuses, type OrderStatus } from '@rifaria/shared';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Raffle', index: true })
  raffleId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  email!: string;

  @Prop({ required: true, trim: true })
  phone!: string;

  @Prop({ required: true, min: 10 })
  ticketQty!: number;

  @Prop({ required: true, min: 0 })
  totalAmount!: number;

  @Prop({ type: String, enum: orderStatuses, default: 'initiated' })
  status!: OrderStatus;

  @Prop({ type: [String], default: [] })
  ticketNumbers!: string[];

  @Prop({ type: Types.ObjectId, ref: 'Payment', default: null })
  paymentId!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  expiresAt!: Date | null;

  @Prop({ type: String, default: null })
  failureReason!: string | null;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ email: 1, createdAt: -1 });
OrderSchema.index({ status: 1, expiresAt: 1 });
