import { model, models, Schema, type InferSchemaType } from "@/lib/db/model-compat";

import { metadataField } from "@/lib/db/models/model-helpers";

const auditLogSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, default: null, index: true },
    actorId: { type: String, default: null, index: true },
    action: { type: String, required: true, trim: true, index: true },
    entityType: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, default: null, index: true },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    ipAddress: { type: String, default: null, trim: true },
    userAgent: { type: String, default: null, trim: true },
    requestId: { type: String, default: null, index: true },
    severity: {
      type: String,
      enum: ["INFO", "WARNING", "ERROR", "CRITICAL"],
      default: "INFO",
      index: true,
    },
    metadata: metadataField,
  },
  { collection: "audit_logs", timestamps: true },
);

const reportSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    reportedById: { type: String, required: true, index: true },
    entityType: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, required: true, index: true },
    reason: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: null, trim: true },
    assignedToId: { type: String, default: null, index: true },
    status: {
      type: String,
      enum: ["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"],
      default: "OPEN",
      index: true,
    },
    metadata: metadataField,
  },
  { collection: "reports", timestamps: true },
);

const moderationActionSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    moderatorId: { type: String, required: true, index: true },
    entityType: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, required: true, index: true },
    action: { type: String, required: true, trim: true, index: true },
    reason: { type: String, default: null, trim: true },
    duration: { type: Number, default: null },
    expiresAt: { type: Date, default: null, index: true },
    metadata: metadataField,
  },
  { collection: "moderation_actions", timestamps: true },
);

auditLogSchema.index({ universityId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
reportSchema.index({ universityId: 1, status: 1, createdAt: -1 });
reportSchema.index({ entityType: 1, entityId: 1 });
moderationActionSchema.index({
  universityId: 1,
  moderatorId: 1,
  createdAt: -1,
});
moderationActionSchema.index({ entityType: 1, entityId: 1 });

export type AuditLogDocument = InferSchemaType<typeof auditLogSchema>;
export type ReportDocument = InferSchemaType<typeof reportSchema>;
export type ModerationActionDocument = InferSchemaType<
  typeof moderationActionSchema
>;

export const AuditLogModel =
  models.AuditLog || model<AuditLogDocument>("AuditLog", auditLogSchema);
export const ReportModel =
  models.Report || model<ReportDocument>("Report", reportSchema);
export const ModerationActionModel =
  models.ModerationAction ||
  model<ModerationActionDocument>("ModerationAction", moderationActionSchema);
