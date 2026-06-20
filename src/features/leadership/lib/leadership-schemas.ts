import { z } from "zod";

const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(180),
  url: z.string().trim().url(),
  fileType: z.string().trim().max(80).optional().nullable(),
  fileSize: z.coerce.number().int().min(0).optional().nullable(),
});

export const leadershipScopeSchema = z.enum([
  "UNIVERSITY",
  "COLLEGE",
  "DEPARTMENT",
  "CLASS",
  "COMMITTEE",
]);

export const leadershipAssignmentStatusSchema = z.enum([
  "ACTIVE",
  "EXPIRED",
  "REMOVED",
  "ENDED",
  "TRANSFERRED",
  "CANCELLED",
]);

const leadershipPositionBaseSchema = z.object({
  universityId: z.string().trim().min(1).optional(),
  collegeId: z.string().trim().min(1).optional().nullable(),
  departmentId: z.string().trim().min(1).optional().nullable(),
  committeeId: z.string().trim().min(1).optional().nullable(),
  name: z.string().trim().min(1).max(140).optional(),
  title: z.string().trim().min(1).max(140).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  parentPositionId: z.string().trim().min(1).optional().nullable(),
  roleType: z
    .enum(["ACADEMIC", "ADMINISTRATIVE", "STUDENT_LEADERSHIP", "SYSTEM"])
    .optional()
    .default("ADMINISTRATIVE"),
  level: leadershipScopeSchema,
  permissions: z.array(z.string().trim().min(1)).optional().default([]),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export const createLeadershipPositionSchema = leadershipPositionBaseSchema
  .superRefine((value, context) => {
    if (!value.name && !value.title) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Leadership position name is required.",
        path: ["name"],
      });
    }
  })
  .transform((value) => ({
    ...value,
    name: value.name ?? value.title ?? "",
    title: value.title ?? value.name ?? "",
  }));

export const updateLeadershipPositionSchema = leadershipPositionBaseSchema
  .partial()
  .transform((value) => ({
    ...value,
    ...(value.name && !value.title ? { title: value.name } : {}),
    ...(value.title && !value.name ? { name: value.title } : {}),
  }));

export const listLeadershipPositionsQuerySchema = z.object({
  universityId: z.string().trim().min(1).optional(),
  collegeId: z.string().trim().min(1).optional(),
  departmentId: z.string().trim().min(1).optional(),
  committeeId: z.string().trim().min(1).optional(),
  level: leadershipScopeSchema.optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional().default("ACTIVE"),
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const assignLeadershipSchema = z.object({
  userId: z.string().trim().min(1),
  positionId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(140).optional(),
  title: z.string().trim().min(1).max(140).optional(),
  termLabel: z.string().trim().max(120).optional().nullable(),
  startDate: z.coerce.date().optional(),
  startedAt: z.coerce.date().optional(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export const endLeadershipTermSchema = z.object({
  endDate: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional(),
  endReason: z.string().trim().max(240).optional().nullable(),
  status: z
    .enum(["EXPIRED", "REMOVED", "ENDED", "CANCELLED", "TRANSFERRED"])
    .optional()
    .default("EXPIRED"),
});

export const transferLeadershipSchema = z.object({
  userId: z.string().trim().min(1).optional(),
  positionId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(140).optional(),
  title: z.string().trim().min(1).max(140).optional(),
  termLabel: z.string().trim().max(120).optional().nullable(),
  startDate: z.coerce.date().optional(),
  startedAt: z.coerce.date().optional(),
  endReason: z.string().trim().max(240).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export const leadershipAssignmentQuerySchema = z.object({
  universityId: z.string().trim().min(1).optional(),
  collegeId: z.string().trim().min(1).optional(),
  departmentId: z.string().trim().min(1).optional(),
  committeeId: z.string().trim().min(1).optional(),
  scopeType: leadershipScopeSchema.optional(),
  userId: z.string().trim().min(1).optional(),
  positionId: z.string().trim().min(1).optional(),
  status: leadershipAssignmentStatusSchema.optional(),
  includeHistorical: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().trim().optional(),
});

export const leadershipReportStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
]);

export const createLeadershipReportSchema = z.object({
  assignmentId: z.string().trim().min(1).optional().nullable(),
  committeeId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().min(1).max(10000).optional(),
  reportType: z
    .enum(["MONTHLY", "QUARTERLY", "EVENT", "ISSUE", "COMMITTEE", "PROJECT", "GENERAL"])
    .default("GENERAL"),
  summary: z.string().trim().max(700).optional().nullable(),
  content: z.string().trim().min(1).optional(),
  reportingPeriodStart: z.coerce.date().optional().nullable(),
  reportingPeriodEnd: z.coerce.date().optional().nullable(),
  attachments: z.array(attachmentSchema).optional().default([]),
  status: z.enum(["DRAFT", "SUBMITTED"]).optional().default("DRAFT"),
  metadata: z.record(z.unknown()).optional().nullable(),
}).superRefine((value, context) => {
  if (!value.description && !value.content) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Report description is required.",
      path: ["description"],
    });
  }
  if (
    value.reportingPeriodStart &&
    value.reportingPeriodEnd &&
    value.reportingPeriodEnd < value.reportingPeriodStart
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Reporting period end must be after the start date.",
      path: ["reportingPeriodEnd"],
    });
  }
});

export const leadershipReportQuerySchema = z.object({
  universityId: z.string().trim().min(1).optional(),
  collegeId: z.string().trim().min(1).optional(),
  departmentId: z.string().trim().min(1).optional(),
  committeeId: z.string().trim().min(1).optional(),
  scopeType: leadershipScopeSchema.optional(),
  assignmentId: z.string().trim().min(1).optional(),
  authorId: z.string().trim().min(1).optional(),
  reportType: z
    .enum(["MONTHLY", "QUARTERLY", "EVENT", "ISSUE", "COMMITTEE", "PROJECT", "GENERAL"])
    .optional(),
  submittedById: z.string().trim().min(1).optional(),
  status: leadershipReportStatusSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().trim().optional(),
});

export const reviewLeadershipReportSchema = z.object({
  reviewNotes: z.string().trim().max(2000).optional().nullable(),
});

export const approveLeadershipReportSchema = z.object({
  reviewNotes: z.string().trim().max(2000).optional().nullable(),
});

export const rejectLeadershipReportSchema = z.object({
  rejectionReason: z.string().trim().min(1).max(3000),
});

export const archiveLeadershipReportSchema = z.object({
  archiveReason: z.string().trim().max(500).optional().nullable(),
});

export const leadershipReportAnalyticsQuerySchema = z.object({
  universityId: z.string().trim().min(1).optional(),
  collegeId: z.string().trim().min(1).optional(),
  departmentId: z.string().trim().min(1).optional(),
  committeeId: z.string().trim().min(1).optional(),
  scopeType: leadershipScopeSchema.optional(),
  reportType: z
    .enum(["MONTHLY", "QUARTERLY", "EVENT", "ISSUE", "COMMITTEE", "PROJECT", "GENERAL"])
    .optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
