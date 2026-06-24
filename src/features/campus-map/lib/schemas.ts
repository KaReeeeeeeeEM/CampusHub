import { z } from "zod";

export const mapLocationCategorySchema = z.enum([
  "ACADEMIC",
  "OFFICE",
  "HOSTEL",
  "LIBRARY",
  "CAFETERIA",
  "LABORATORY",
  "HEALTH",
  "SPORTS",
  "PARKING",
  "OTHER",
]);

export const mapLocationStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
]);

const contactInformationSchema = z
  .object({
    phone: z.string().trim().max(32).optional().nullable(),
    email: z.string().trim().email().optional().nullable(),
    website: z.string().trim().url().optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .optional()
  .nullable();

export const createMapLocationSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional().nullable(),
  category: mapLocationCategorySchema.default("OTHER"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  buildingCode: z.string().trim().max(40).optional().nullable(),
  contactInformation: contactInformationSchema,
  images: z.array(z.string().trim().url()).optional().default([]),
  status: mapLocationStatusSchema.default("ACTIVE"),
  navigation: z.record(z.string(), z.unknown()).optional().nullable(),
  liveLocation: z.record(z.string(), z.unknown()).optional().nullable(),
  marketplaceDelivery: z
    .object({
      enabled: z.coerce.boolean().optional().default(false),
      instructions: z.string().trim().max(500).optional().nullable(),
    })
    .optional(),
  eventLocation: z
    .object({
      enabled: z.coerce.boolean().optional().default(true),
      capacityHint: z.coerce.number().int().min(1).optional().nullable(),
    })
    .optional(),
});

export const updateMapLocationSchema = createMapLocationSchema.partial();

export const mapLocationQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  category: mapLocationCategorySchema.optional(),
  status: mapLocationStatusSchema.optional(),
  includeInactive: z.coerce.boolean().optional().default(false),
});

export const nearbyLocationsQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().int().min(1).max(20000).default(1000),
  category: mapLocationCategorySchema.optional(),
});

export const directionRequestSchema = z.object({
  originLatitude: z.coerce.number().min(-90).max(90).optional(),
  originLongitude: z.coerce.number().min(-180).max(180).optional(),
});

export type CreateMapLocationInput = z.infer<typeof createMapLocationSchema>;
export type UpdateMapLocationInput = z.infer<typeof updateMapLocationSchema>;
