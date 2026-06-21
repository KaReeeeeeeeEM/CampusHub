import { z } from "zod";

export const shopStatusSchema = z.enum([
  "ACTIVE",
  "PAUSED",
  "SUSPENDED",
  "CLOSED",
]);

export const shopLocationSchema = z
  .object({
    locationId: z.string().trim().min(1).optional().nullable(),
    name: z.string().trim().max(160).optional().nullable(),
    address: z.string().trim().max(300).optional().nullable(),
    latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
    longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  })
  .optional()
  .nullable();

export const createShopSchema = z.object({
  name: z.string().trim().min(2).max(140),
  description: z.string().trim().min(10).max(3000),
  logo: z.string().trim().url().optional().nullable(),
  bannerImage: z.string().trim().url().optional().nullable(),
  category: z.string().trim().min(1).max(80),
  contactPhone: z.string().trim().min(5).max(32).optional().nullable(),
  contactEmail: z.string().trim().email().optional().nullable(),
  whatsappNumber: z.string().trim().min(5).max(32).optional().nullable(),
  openingHours: z
    .object({
      availabilityStatus: z
        .enum(["Open", "Open 24/7", "Limited Hours", "Closed"])
        .optional(),
      openingTime: z.string().trim().optional().nullable(),
      closingTime: z.string().trim().optional().nullable(),
    })
    .optional()
    .nullable(),
  location: shopLocationSchema,
});

export const updateShopSchema = createShopSchema.partial();

export const shopQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  category: z.string().trim().optional(),
  status: shopStatusSchema.optional(),
  verified: z.coerce.boolean().optional(),
  ownerId: z.string().trim().optional(),
  universityId: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const shopAnalyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
});

export type ShopStatusInput = z.infer<typeof shopStatusSchema>;
