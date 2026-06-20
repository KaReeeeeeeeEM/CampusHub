import { z } from "zod";

export const marketplaceLocationTypeSchema = z.enum([
  "CAMPUS_LOCATION",
  "MAP_LOCATION",
  "CURRENT_LOCATION",
  "CUSTOM",
]);

export const marketplaceLocationInputSchema = z.object({
  locationType: marketplaceLocationTypeSchema,
  savedLocationId: z.string().trim().min(1).optional().nullable(),
  mapLocationId: z.string().trim().min(1).optional().nullable(),
  label: z.string().trim().min(1).max(120).optional().nullable(),
  name: z.string().trim().min(1).max(160).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  instructions: z.string().trim().max(500).optional().nullable(),
  saveForLater: z.coerce.boolean().optional().default(false),
  isDefault: z.coerce.boolean().optional().default(false),
});

export const createSavedLocationSchema = marketplaceLocationInputSchema
  .omit({ savedLocationId: true, saveForLater: true })
  .extend({
    label: z.string().trim().min(1).max(120),
  });

export const updateSavedLocationSchema = createSavedLocationSchema.partial();

export const savedLocationQuerySchema = z.object({
  locationType: marketplaceLocationTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const marketplaceLocationSearchSchema = z.object({
  q: z.string().trim().optional().default(""),
  includeSaved: z.coerce.boolean().optional().default(true),
  includeMapLocations: z.coerce.boolean().optional().default(true),
  marketplaceDeliveryOnly: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export const attachOrderRequestLocationSchema = z.object({
  deliveryLocation: marketplaceLocationInputSchema,
});
