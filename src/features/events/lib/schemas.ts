import { z } from "zod";

export const eventTypeSchema = z.enum([
  "ACADEMIC",
  "SPORTS",
  "CLUB",
  "WORKSHOP",
  "HACKATHON",
  "SEMINAR",
  "CAREER",
  "SOCIAL",
]);

export const eventStatusSchema = z.enum([
  "DRAFT",
  "OPEN",
  "FULL",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
]);

export const eventVisibilitySchema = z.enum([
  "ALL_USERS",
  "STUDENTS",
  "TEACHERS",
  "ALUMNI",
  "EMPLOYERS",
  "SPECIFIC_COLLEGES",
  "SPECIFIC_DEPARTMENTS",
]);

const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(160),
  url: z.string().trim().url(),
  fileType: z.string().trim().max(80).optional().nullable(),
  fileSize: z.coerce.number().int().min(0).optional().nullable(),
});

const eventPayloadSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().max(5000).optional().nullable(),
  eventType: eventTypeSchema,
  collegeIds: z.array(z.string().trim().min(1)).optional().default([]),
  departmentIds: z.array(z.string().trim().min(1)).optional().default([]),
  venue: z.string().trim().min(2).max(240),
  locationId: z.string().trim().min(1).optional().nullable(),
  locationName: z.string().trim().min(1).optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  registrationDeadline: z.coerce.date().optional().nullable(),
  capacity: z.coerce.number().int().min(1).optional().nullable(),
  allowWaitlist: z.coerce.boolean().optional().default(true),
  status: eventStatusSchema.default("DRAFT"),
  visibility: eventVisibilitySchema.default("ALL_USERS"),
  bannerImage: z.string().trim().url().optional().nullable(),
  attachments: z.array(attachmentSchema).optional().default([]),
});

function validateEventPayload(
  value: {
    startDate?: Date;
    endDate?: Date;
    registrationDeadline?: Date | null;
    visibility?: z.infer<typeof eventVisibilitySchema>;
    collegeIds?: string[];
    departmentIds?: string[];
  },
  ctx: z.RefinementCtx,
) {
  if (value.startDate && value.endDate && value.endDate <= value.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End date must be after start date.",
      path: ["endDate"],
    });
  }

  if (
    value.registrationDeadline &&
    value.startDate &&
    value.registrationDeadline > value.startDate
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Registration deadline cannot be after the start date.",
      path: ["registrationDeadline"],
    });
  }

  if (value.visibility === "SPECIFIC_COLLEGES" && !value.collegeIds?.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one college is required for college visibility.",
      path: ["collegeIds"],
    });
  }

  if (
    value.visibility === "SPECIFIC_DEPARTMENTS" &&
    !value.departmentIds?.length
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one department is required for department visibility.",
      path: ["departmentIds"],
    });
  }
}

export const createEventSchema =
  eventPayloadSchema.superRefine(validateEventPayload);

export const updateEventSchema = eventPayloadSchema
  .partial()
  .superRefine(validateEventPayload);

export const eventQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  eventType: eventTypeSchema.optional(),
  status: eventStatusSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  mine: z.coerce.boolean().optional().default(false),
  includeCancelled: z.coerce.boolean().optional().default(false),
});

export const qrValidationSchema = z.object({
  qrCode: z.string().trim().min(16),
  userId: z.string().trim().min(1).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventQueryInput = z.infer<typeof eventQuerySchema>;
export type EventVisibility = z.infer<typeof eventVisibilitySchema>;
