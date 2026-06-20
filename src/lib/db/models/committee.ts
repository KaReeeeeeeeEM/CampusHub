import { model, models, Schema, type InferSchemaType } from "mongoose";

import {
  attachmentSchema,
  metadataField,
  tenantLifecycleFields,
} from "@/lib/db/models/model-helpers";

const committeeSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    collegeId: { type: String, default: null, index: true },
    departmentId: { type: String, default: null, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, default: null, trim: true },
    scopeType: {
      type: String,
      enum: ["UNIVERSITY", "COLLEGE", "DEPARTMENT"],
      default: "UNIVERSITY",
      index: true,
    },
    committeeType: {
      type: String,
      enum: ["ACADEMIC", "WELFARE", "DISCIPLINARY", "EVENTS", "FINANCE", "GENERAL"],
      default: "GENERAL",
      index: true,
    },
    category: {
      type: String,
      enum: ["ACADEMIC", "WELFARE", "DISCIPLINARY", "EVENTS", "FINANCE", "GENERAL"],
      default: "GENERAL",
      index: true,
    },
    chairpersonId: { type: String, default: null, index: true },
    viceChairpersonId: { type: String, default: null, index: true },
    secretaryId: { type: String, default: null, index: true },
    chairUserId: { type: String, default: null, index: true },
    memberCount: { type: Number, default: 0, min: 0, index: true },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "committees", timestamps: true },
);

const committeeMemberSchema = new Schema(
  {
    _id: { type: String, required: true },
    committeeId: { type: String, required: true, index: true },
    universityId: { type: String, required: true, index: true },
    collegeId: { type: String, default: null, index: true },
    departmentId: { type: String, default: null, index: true },
    userId: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: [
        "CHAIRPERSON",
        "VICE_CHAIRPERSON",
        "SECRETARY",
        "MEMBER",
        "CHAIR",
        "TREASURER",
      ],
      default: "MEMBER",
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "REMOVED"],
      default: "ACTIVE",
      index: true,
    },
    joinedAt: { type: Date, default: Date.now, index: true },
    leftAt: { type: Date, default: null, index: true },
    metadata: metadataField,
  },
  { collection: "committee_members", timestamps: true },
);

const committeeReportSchema = new Schema(
  {
    _id: { type: String, required: true },
    committeeId: { type: String, required: true, index: true },
    universityId: { type: String, required: true, index: true },
    authoredById: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    summary: { type: String, default: null, trim: true },
    content: { type: String, required: true, trim: true },
    attachments: { type: [attachmentSchema], default: [] },
    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED", "APPROVED", "ARCHIVED"],
      default: "DRAFT",
      index: true,
    },
    submittedAt: { type: Date, default: null, index: true },
    approvedById: { type: String, default: null, index: true },
    approvedAt: { type: Date, default: null, index: true },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "committee_reports", timestamps: true },
);

const committeeMeetingSchema = new Schema(
  {
    _id: { type: String, required: true },
    committeeId: { type: String, required: true, index: true },
    universityId: { type: String, required: true, index: true },
    scheduledById: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    agenda: { type: [String], default: [] },
    minutes: { type: String, default: null, trim: true },
    decisions: { type: [String], default: [] },
    attendeeIds: { type: [String], default: [], index: true },
    scheduledAt: { type: Date, required: true, index: true },
    endedAt: { type: Date, default: null, index: true },
    status: {
      type: String,
      enum: ["SCHEDULED", "COMPLETED", "CANCELLED"],
      default: "SCHEDULED",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "committee_meetings", timestamps: true },
);

committeeSchema.index({ universityId: 1, slug: 1 }, { unique: true });
committeeSchema.index({ universityId: 1, scopeType: 1, status: 1 });
committeeSchema.index({ universityId: 1, category: 1, status: 1 });
committeeSchema.index({ universityId: 1, chairpersonId: 1, status: 1 });
committeeMemberSchema.index(
  { committeeId: 1, userId: 1 },
  { unique: true },
);
committeeMemberSchema.index({ universityId: 1, userId: 1, status: 1 });
committeeReportSchema.index({ committeeId: 1, status: 1, createdAt: -1 });
committeeReportSchema.index({ universityId: 1, status: 1, createdAt: -1 });
committeeMeetingSchema.index({ committeeId: 1, scheduledAt: -1 });
committeeMeetingSchema.index({ universityId: 1, status: 1, scheduledAt: -1 });

export type CommitteeDocument = InferSchemaType<typeof committeeSchema>;
export type CommitteeMemberDocument = InferSchemaType<typeof committeeMemberSchema>;
export type CommitteeReportDocument = InferSchemaType<typeof committeeReportSchema>;
export type CommitteeMeetingDocument = InferSchemaType<typeof committeeMeetingSchema>;

export const CommitteeModel =
  models.Committee || model<CommitteeDocument>("Committee", committeeSchema);
export const CommitteeMemberModel =
  models.CommitteeMember ||
  model<CommitteeMemberDocument>("CommitteeMember", committeeMemberSchema);
export const CommitteeReportModel =
  models.CommitteeReport ||
  model<CommitteeReportDocument>("CommitteeReport", committeeReportSchema);
export const CommitteeMeetingModel =
  models.CommitteeMeeting ||
  model<CommitteeMeetingDocument>("CommitteeMeeting", committeeMeetingSchema);
