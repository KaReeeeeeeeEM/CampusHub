import { z } from "zod";

export const almanacEventTypeSchema = z.enum([
  "SEMESTER_START",
  "SEMESTER_END",
  "REGISTRATION",
  "EXAMINATION",
  "GRADUATION",
  "ORIENTATION",
  "HOLIDAY",
  "WORKSHOP",
  "GENERAL",
]);

export const almanacStatusSchema = z.enum(["ACTIVE", "ARCHIVED", "CANCELLED"]);

export const almanacVisibilitySchema = z.enum([
  "ALL_USERS",
  "STUDENTS",
  "TEACHERS",
  "SPECIFIC_COLLEGES",
]);

const reminderInputSchema = z
  .object({
    offsetDays: z.coerce.number().int().min(0).max(365).optional(),
    remindAt: z.coerce.date().optional(),
    label: z.string().trim().max(120).optional().nullable(),
  })
  .refine((value) => value.offsetDays !== undefined || value.remindAt, {
    message: "Reminder requires either offsetDays or remindAt.",
    path: ["offsetDays"],
  });

const almanacPayloadSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().max(3000).optional().nullable(),
  eventType: almanacEventTypeSchema.default("GENERAL"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isAllDay: z.coerce.boolean().optional().default(true),
  visibility: almanacVisibilitySchema.default("ALL_USERS"),
  collegeIds: z.array(z.string().trim().min(1)).optional().default([]),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .optional()
    .default("#2563eb"),
  status: almanacStatusSchema.default("ACTIVE"),
  reminders: z.array(reminderInputSchema).optional().default([]),
  academicYear: z.string().trim().max(40).optional().nullable(),
  semester: z.string().trim().max(80).optional().nullable(),
});

function validateAlmanacPayload(
  value: {
    startDate?: Date;
    endDate?: Date;
    visibility?: z.infer<typeof almanacVisibilitySchema>;
    collegeIds?: string[];
  },
  ctx: z.RefinementCtx,
) {
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End date cannot be before start date.",
      path: ["endDate"],
    });
  }

  if (value.visibility === "SPECIFIC_COLLEGES" && !value.collegeIds?.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one college is required for college visibility.",
      path: ["collegeIds"],
    });
  }
}

export const createAlmanacEventSchema = almanacPayloadSchema.superRefine(
  validateAlmanacPayload,
);

export const updateAlmanacEventSchema = almanacPayloadSchema
  .partial()
  .superRefine(validateAlmanacPayload);

export const almanacQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  eventType: almanacEventTypeSchema.optional(),
  status: almanacStatusSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  includeArchived: z.coerce.boolean().optional().default(false),
});

export const calendarRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

export const currentSemesterQuerySchema = z.object({
  date: z.coerce
    .date()
    .optional()
    .default(() => new Date()),
});

export const sendReminderSchema = z.object({
  reminderId: z.string().trim().min(1).optional(),
});

export type CreateAlmanacEventInput = z.infer<typeof createAlmanacEventSchema>;
export type UpdateAlmanacEventInput = z.infer<typeof updateAlmanacEventSchema>;
export type AlmanacVisibility = z.infer<typeof almanacVisibilitySchema>;
