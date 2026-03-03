import { z } from 'zod';
import { MIN_TICKETS_PER_ORDER } from '../domain/constants.js';

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
