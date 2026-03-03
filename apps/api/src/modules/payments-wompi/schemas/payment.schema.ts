import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { paymentStatuses, type PaymentStatus } from '@rifaria/shared';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Order', index: true })
  orderId!: Types.ObjectId;

  @Prop({ required: true, default: 'wompi' })
  provider!: string;

  @Prop({ required: true, index: true })
  reference!: string;

  @Prop({ type: String, default: null, index: true, sparse: true, unique: true })
  providerTransactionId!: string | null;

  @Prop({ type: String, enum: paymentStatuses, default: 'pending' })
  status!: PaymentStatus;

  @Prop({ required: true, min: 0 })
  amountInCents!: number;

  @Prop({ required: true, default: 'COP' })
  currency!: string;

  @Prop({ type: Object, default: {} })
  providerPayload!: Record<string, unknown>;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({ type: String, default: null })
  failureReason!: string | null;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ provider: 1, reference: 1 }, { unique: true });
