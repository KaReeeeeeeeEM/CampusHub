import { z } from "zod";

export const productTypeSchema = z.enum(["PHYSICAL", "DIGITAL", "SERVICE"]);

export const productVisibilitySchema = z.enum([
  "ALL_USERS",
  "STUDENTS",
  "TEACHERS",
  "ALUMNI",
  "EMPLOYERS",
  "CUSTOM",
]);

export const productStatusSchema = z.enum([
  "ACTIVE",
  "OUT_OF_STOCK",
  "PAUSED",
  "ARCHIVED",
]);

export const productLocationSchema = z
  .object({
    locationId: z.string().trim().min(1).optional().nullable(),
    name: z.string().trim().max(160).optional().nullable(),
    address: z.string().trim().max(300).optional().nullable(),
    latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
    longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  })
  .optional()
  .nullable();

export const createProductSchema = z.object({
  shopId: z.string().trim().min(1),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().min(10).max(5000),
  images: z.array(z.string().trim().url()).optional().default([]),
  category: z.string().trim().min(1).max(80),
  productType: productTypeSchema.default("PHYSICAL"),
  price: z.coerce.number().min(0),
  currency: z.string().trim().min(3).max(3).optional().default("TZS"),
  availability: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .optional()
    .default("AVAILABLE"),
  visibility: productVisibilitySchema.default("ALL_USERS"),
  customAudience: z.array(z.string().trim().min(1)).optional().default([]),
  location: productLocationSchema,
});

export const updateProductSchema = createProductSchema
  .omit({ shopId: true })
  .partial();

export const productQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  shopId: z.string().trim().optional(),
  ownerId: z.string().trim().optional(),
  universityId: z.string().trim().optional(),
  category: z.string().trim().optional(),
  productType: productTypeSchema.optional(),
  visibility: productVisibilitySchema.optional(),
  status: productStatusSchema.optional(),
  featured: z.coerce.boolean().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const productAnalyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
});

export const productClickTrackingSchema = z.object({
  clickType: z
    .enum(["DETAIL", "CONTACT", "ORDER_REQUEST", "EXTERNAL_LINK"])
    .optional()
    .default("DETAIL"),
  metadata: z.record(z.unknown()).optional().nullable(),
});
