import { z } from "zod";

const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(180),
  url: z.string().trim().url(),
  fileType: z.string().trim().max(80).optional().nullable(),
  fileSize: z.coerce.number().int().min(0).optional().nullable(),
});

export const committeeScopeSchema = z.enum([
  "UNIVERSITY",
  "COLLEGE",
  "DEPARTMENT",
]);

export const committeeTypeSchema = z.enum([
  "ACADEMIC",
  "WELFARE",
  "DISCIPLINARY",
  "EVENTS",
  "FINANCE",
  "GENERAL",
]);

export const committeeMemberRoleSchema = z.enum([
  "CHAIRPERSON",
  "VICE_CHAIRPERSON",
  "SECRETARY",
  "MEMBER",
]);

export const createCommitteeSchema = z.object({
  universityId: z.string().trim().min(1).optional(),
  collegeId: z.string().trim().min(1).optional().nullable(),
  departmentId: z.string().trim().min(1).optional().nullable(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1200).optional().nullable(),
  scopeType: committeeScopeSchema.default("UNIVERSITY"),
  category: committeeTypeSchema.optional(),
  committeeType: committeeTypeSchema.default("GENERAL"),
  chairpersonId: z.string().trim().min(1).optional().nullable(),
  viceChairpersonId: z.string().trim().min(1).optional().nullable(),
  secretaryId: z.string().trim().min(1).optional().nullable(),
  chairUserId: z.string().trim().min(1).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const committeeQuerySchema = z.object({
  universityId: z.string().trim().min(1).optional(),
  collegeId: z.string().trim().min(1).optional(),
  departmentId: z.string().trim().min(1).optional(),
  scopeType: committeeScopeSchema.optional(),
  category: committeeTypeSchema.optional(),
  committeeType: committeeTypeSchema.optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional().default("ACTIVE"),
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().trim().optional(),
});

export const assignCommitteeMemberSchema = z.object({
  userId: z.string().trim().min(1),
  role: committeeMemberRoleSchema.default("MEMBER"),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const transferCommitteeRoleSchema = z.object({
  userId: z.string().trim().min(1),
  role: committeeMemberRoleSchema,
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const committeeAnalyticsQuerySchema = z.object({
  universityId: z.string().trim().min(1).optional(),
  committeeId: z.string().trim().min(1).optional(),
  category: committeeTypeSchema.optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});

export const createCommitteeAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(180),
  content: z.string().trim().min(1),
  summary: z.string().trim().max(500).optional().nullable(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("PUBLISHED"),
  attachments: z.array(attachmentSchema).optional().default([]),
});

export const createCommitteeEventSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(2000).optional().nullable(),
  eventType: z
    .enum(["ACADEMIC", "SPORTS", "CLUB", "WORKSHOP", "HACKATHON", "SEMINAR", "CAREER", "SOCIAL"])
    .default("SOCIAL"),
  venue: z.string().trim().min(1).max(200),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  registrationDeadline: z.coerce.date().optional().nullable(),
  capacity: z.coerce.number().int().min(1).optional().nullable(),
  attachments: z.array(attachmentSchema).optional().default([]),
});

export const createCommitteePollSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(1200).optional().nullable(),
  pollType: z
    .enum(["GENERAL", "LEADERSHIP", "ACADEMIC", "EVENT", "SURVEY", "REFERENDUM"])
    .default("GENERAL"),
  options: z.array(z.string().trim().min(1).max(180)).min(2).max(12),
  allowMultipleSelection: z.coerce.boolean().default(false),
  anonymous: z.coerce.boolean().default(false),
  endDate: z.coerce.date(),
});

export const createCommitteeSuggestionSchema = z.object({
  title: z.string().trim().min(4).max(180),
  description: z.string().trim().min(1).max(10000),
  category: z
    .enum([
      "Academics",
      "Facilities",
      "Hostels",
      "Internet",
      "Library",
      "Health",
      "Administration",
      "Security",
      "Other",
    ])
    .default("Administration"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  anonymous: z.coerce.boolean().default(false),
  attachments: z.array(attachmentSchema).optional().default([]),
});

export const createCommitteeCommunitySchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(3000).optional().nullable(),
  coverImage: z.string().trim().url().optional().nullable(),
  visibility: z.enum(["PUBLIC", "UNIVERSITY", "PRIVATE"]).default("UNIVERSITY"),
});

export const createCommitteeReportSchema = z.object({
  title: z.string().trim().min(1).max(180),
  summary: z.string().trim().max(500).optional().nullable(),
  content: z.string().trim().min(1),
  status: z.enum(["DRAFT", "SUBMITTED"]).default("DRAFT"),
  attachments: z.array(attachmentSchema).optional().default([]),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const createCommitteeMeetingSchema = z.object({
  title: z.string().trim().min(1).max(180),
  agenda: z.array(z.string().trim().min(1).max(240)).optional().default([]),
  attendeeIds: z.array(z.string().trim().min(1)).optional().default([]),
  scheduledAt: z.coerce.date(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const completeCommitteeMeetingSchema = z.object({
  minutes: z.string().trim().min(1),
  decisions: z.array(z.string().trim().min(1).max(500)).optional().default([]),
  attendeeIds: z.array(z.string().trim().min(1)).optional(),
  endedAt: z.coerce.date().optional(),
});
