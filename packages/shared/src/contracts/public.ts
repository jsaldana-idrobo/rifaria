import { z } from 'zod';
import { MIN_TICKETS_PER_ORDER } from '../domain/constants.js';
import { prizeDrawTypes } from '../domain/status.js';

export const createOrderSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7).max(20),
  ticketQty: z.number().int().min(MIN_TICKETS_PER_ORDER).max(200)
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const createCheckoutSchema = z.object({
  orderId: z.string().min(10),
  returnUrl: z.string().url()
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;

export const postponeRaffleSchema = z.object({
  newDrawAt: z.coerce.date(),
  reason: z.string().trim().min(10).max(500),
  notifyParticipants: z.boolean().default(true)
});

export type PostponeRaffleInput = z.infer<typeof postponeRaffleSchema>;

export const createPrizeDrawSchema = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(10).max(1200),
  prizeType: z.enum(prizeDrawTypes),
  displayValue: z.string().trim().min(2).max(140),
  imageUrl: z.string().trim().url(),
  drawAt: z.coerce.date(),
  drawSource: z.string().trim().min(3).max(200),
  isMajorPrize: z.boolean().default(false)
});

export type CreatePrizeDrawInput = z.infer<typeof createPrizeDrawSchema>;

export const updatePrizeDrawSchema = createPrizeDrawSchema.partial();

export type UpdatePrizeDrawInput = z.infer<typeof updatePrizeDrawSchema>;

export const reorderPrizeDrawsSchema = z.object({
  orderedIds: z.array(z.string().trim().min(10)).min(1)
});

export type ReorderPrizeDrawsInput = z.infer<typeof reorderPrizeDrawsSchema>;

export const settlePrizeDrawSchema = z.object({
  winningNumber: z.string().regex(/^\d{4}$/),
  drawResultSourceUrl: z.string().trim().url()
});

export type SettlePrizeDrawInput = z.infer<typeof settlePrizeDrawSchema>;
