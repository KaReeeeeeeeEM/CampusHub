import { model, models, Schema, type InferSchemaType } from "@/lib/db/model-compat";

import {
  attachmentSchema,
  metadataField,
  tenantLifecycleFields,
} from "@/lib/db/models/model-helpers";

const leadershipAssignmentSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    collegeId: { type: String, default: null, index: true },
    departmentId: { type: String, default: null, index: true },
    committeeId: { type: String, default: null, index: true },
    scopeType: {
      type: String,
      enum: ["UNIVERSITY", "COLLEGE", "DEPARTMENT", "CLASS", "COMMITTEE"],
      required: true,
      index: true,
    },
    positionId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    termLabel: { type: String, default: null, trim: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, default: null, index: true },
    startedAt: { type: Date, required: true, index: true },
    endedAt: { type: Date, default: null, index: true },
    endReason: { type: String, default: null, trim: true },
    appointedBy: { type: String, required: true, index: true },
    transferredFromAssignmentId: { type: String, default: null, index: true },
    transferredToAssignmentId: { type: String, default: null, index: true },
    status: {
      type: String,
      enum: [
        "ACTIVE",
        "EXPIRED",
        "REMOVED",
        "ENDED",
        "TRANSFERRED",
        "CANCELLED",
      ],
      default: "ACTIVE",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "leadership_assignments", timestamps: true },
);

const leadershipReportSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    collegeId: { type: String, default: null, index: true },
    departmentId: { type: String, default: null, index: true },
    committeeId: { type: String, default: null, index: true },
    scopeType: {
      type: String,
      enum: ["UNIVERSITY", "COLLEGE", "DEPARTMENT", "CLASS", "COMMITTEE"],
      required: true,
      index: true,
    },
    assignmentId: { type: String, default: null, index: true },
    positionId: { type: String, default: null, index: true },
    authorId: { type: String, required: true, index: true },
    submittedById: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    reportType: {
      type: String,
      enum: ["MONTHLY", "QUARTERLY", "EVENT", "ISSUE", "COMMITTEE", "PROJECT", "GENERAL"],
      default: "GENERAL",
      index: true,
    },
    summary: { type: String, default: null, trim: true },
    content: { type: String, default: null, trim: true },
    reportingPeriodStart: { type: Date, default: null, index: true },
    reportingPeriodEnd: { type: Date, default: null, index: true },
    attachments: { type: [attachmentSchema], default: [] },
    status: {
      type: String,
      enum: [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "ARCHIVED",
      ],
      default: "DRAFT",
      index: true,
    },
    submittedAt: { type: Date, default: null, index: true },
    reviewedBy: { type: String, default: null, index: true },
    reviewedById: { type: String, default: null, index: true },
    reviewedAt: { type: Date, default: null, index: true },
    reviewNotes: { type: String, default: null, trim: true },
    approvedById: { type: String, default: null, index: true },
    approvedAt: { type: Date, default: null, index: true },
    rejectedById: { type: String, default: null, index: true },
    rejectedAt: { type: Date, default: null, index: true },
    rejectionReason: { type: String, default: null, trim: true },
    archivedById: { type: String, default: null, index: true },
    archivedAt: { type: Date, default: null, index: true },
    archiveReason: { type: String, default: null, trim: true },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "leadership_reports", timestamps: true },
);

leadershipAssignmentSchema.index({
  universityId: 1,
  scopeType: 1,
  status: 1,
});
leadershipAssignmentSchema.index({
  universityId: 1,
  positionId: 1,
  status: 1,
});
leadershipAssignmentSchema.index({
  universityId: 1,
  userId: 1,
  startedAt: -1,
});
leadershipAssignmentSchema.index({
  collegeId: 1,
  status: 1,
  startedAt: -1,
});
leadershipAssignmentSchema.index({
  departmentId: 1,
  status: 1,
  startedAt: -1,
});
leadershipAssignmentSchema.index({
  committeeId: 1,
  status: 1,
  startedAt: -1,
});
leadershipReportSchema.index({ universityId: 1, status: 1, createdAt: -1 });
leadershipReportSchema.index({ assignmentId: 1, status: 1, createdAt: -1 });
leadershipReportSchema.index({ universityId: 1, reportType: 1, status: 1 });
leadershipReportSchema.index({ authorId: 1, createdAt: -1 });
leadershipReportSchema.index({
  universityId: 1,
  scopeType: 1,
  reportingPeriodEnd: -1,
});
leadershipReportSchema.index({ submittedById: 1, createdAt: -1 });

export type LeadershipAssignmentDocument = InferSchemaType<
  typeof leadershipAssignmentSchema
>;
export type LeadershipReportDocument = InferSchemaType<
  typeof leadershipReportSchema
>;

export const LeadershipAssignmentModel =
  models.LeadershipAssignment ||
  model<LeadershipAssignmentDocument>(
    "LeadershipAssignment",
    leadershipAssignmentSchema,
  );
export const LeadershipReportModel =
  models.LeadershipReport ||
  model<LeadershipReportDocument>("LeadershipReport", leadershipReportSchema);
