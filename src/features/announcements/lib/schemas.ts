import { z } from "zod";

export const announcementCategorySchema = z.enum([
  "ACADEMICS",
  "SPORTS",
  "OFFERS",
  "CLUBS",
  "LEADERSHIP",
  "CAREER",
  "HEALTH",
  "GENERAL",
]);

export const announcementPrioritySchema = z.enum([
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
]);

export const announcementStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);

export const announcementVisibilitySchema = z.enum([
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

const announcementPayloadSchema = z.object({
  title: z.string().trim().min(3).max(180),
  content: z.string().trim().min(10),
  summary: z.string().trim().max(280).optional().nullable(),
  category: announcementCategorySchema.default("GENERAL"),
  priority: announcementPrioritySchema.default("NORMAL"),
  visibility: announcementVisibilitySchema.default("ALL_USERS"),
  collegeIds: z.array(z.string().trim().min(1)).optional().default([]),
  departmentIds: z.array(z.string().trim().min(1)).optional().default([]),
  publishedAt: z.coerce.date().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  status: announcementStatusSchema.default("DRAFT"),
  attachments: z.array(attachmentSchema).optional().default([]),
});

export const createAnnouncementSchema = announcementPayloadSchema.superRefine(
  (value, ctx) => {
    if (value.visibility === "SPECIFIC_COLLEGES" && !value.collegeIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one college is required for college visibility.",
        path: ["collegeIds"],
      });
    }

    if (
      value.visibility === "SPECIFIC_DEPARTMENTS" &&
      !value.departmentIds.length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "At least one department is required for department visibility.",
        path: ["departmentIds"],
      });
    }
  },
);

export const updateAnnouncementSchema = announcementPayloadSchema
  .partial()
  .superRefine((value, ctx) => {
    if (
      value.visibility === "SPECIFIC_COLLEGES" &&
      value.collegeIds !== undefined &&
      !value.collegeIds.length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one college is required for college visibility.",
        path: ["collegeIds"],
      });
    }

    if (
      value.visibility === "SPECIFIC_DEPARTMENTS" &&
      value.departmentIds !== undefined &&
      !value.departmentIds.length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "At least one department is required for department visibility.",
        path: ["departmentIds"],
      });
    }
  });

export const announcementQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  category: announcementCategorySchema.optional(),
  priority: announcementPrioritySchema.optional(),
  status: announcementStatusSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  includeArchived: z.coerce.boolean().optional().default(false),
  mine: z.coerce.boolean().optional().default(false),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
export type AnnouncementQueryInput = z.infer<typeof announcementQuerySchema>;
export type AnnouncementVisibility = z.infer<
  typeof announcementVisibilitySchema
>;
