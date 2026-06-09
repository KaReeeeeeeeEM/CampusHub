import { z } from "zod";

import { PORTAL_KEYS } from "@/features/portal-selection/lib/portals";

export const portalKeySchema = z.enum(PORTAL_KEYS);

export const portalPreferenceActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("select"),
    portal: portalKeySchema,
  }),
  z.object({
    action: z.literal("set-default"),
    portal: portalKeySchema,
  }),
  z.object({
    action: z.literal("toggle-quick"),
    portal: portalKeySchema,
  }),
  z.object({
    action: z.literal("reset"),
  }),
]);
