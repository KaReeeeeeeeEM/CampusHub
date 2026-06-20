import { z } from "zod";

import { marketplaceLocationInputSchema } from "@/features/marketplace/lib/location-schemas";

export const orderRequestStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "COMPLETED",
  "CANCELLED",
]);

export const deliveryPreferenceSchema = z.enum([
  "MEETUP",
  "PICKUP",
  "CAMPUS_DELIVERY",
  "CUSTOM",
]);

export const createOrderRequestSchema = z.object({
  productId: z.string().trim().min(1),
  message: z.string().trim().max(1000).optional().nullable(),
  quantity: z.coerce.number().int().min(1).max(999).default(1),
  deliveryPreference: deliveryPreferenceSchema,
  deliveryLocation: marketplaceLocationInputSchema.optional().nullable(),
});

export const orderRequestQuerySchema = z.object({
  productId: z.string().trim().optional(),
  shopId: z.string().trim().optional(),
  buyerId: z.string().trim().optional(),
  sellerId: z.string().trim().optional(),
  status: orderRequestStatusSchema.optional(),
  role: z.enum(["BUYER", "SELLER", "ALL"]).optional().default("ALL"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const orderRequestStatusMessageSchema = z.object({
  message: z.string().trim().max(1000).optional().nullable(),
});
