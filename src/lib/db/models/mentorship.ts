import { model, models, Schema, type InferSchemaType } from "mongoose";

import {
  metadataField,
  tenantLifecycleFields,
} from "@/lib/db/models/model-helpers";

const mentorProfileSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    bio: { type: String, default: null, trim: true },
    expertise: { type: [String], default: [], index: true },
    availability: { type: Schema.Types.Mixed, default: null },
    maxMentees: { type: Number, default: 3, min: 1, max: 100, index: true },
    currentMentees: { type: Number, default: 0, min: 0, index: true },
    meetingPreferences: { type: [String], default: [], index: true },
    status: {
      type: String,
      enum: ["ACTIVE", "PAUSED", "INACTIVE"],
      default: "ACTIVE",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "mentor_profiles", timestamps: true },
);

const mentorshipRequestSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    mentorProfileId: { type: String, required: true, index: true },
    mentorId: { type: String, required: true, index: true },
    menteeId: { type: String, required: true, index: true },
    message: { type: String, default: null, trim: true },
    goals: { type: [String], default: [], index: true },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "DECLINED", "COMPLETED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    acceptedAt: { type: Date, default: null, index: true },
    declinedAt: { type: Date, default: null, index: true },
    completedAt: { type: Date, default: null, index: true },
    cancelledAt: { type: Date, default: null, index: true },
    respondedById: { type: String, default: null, index: true },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "mentorship_requests", timestamps: true },
);

const mentorshipSessionSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    mentorshipRequestId: { type: String, required: true, index: true },
    mentorId: { type: String, required: true, index: true },
    menteeId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    notes: { type: String, default: null, trim: true },
    scheduledAt: { type: Date, default: null, index: true },
    completedAt: { type: Date, default: null, index: true },
    durationMinutes: { type: Number, default: null, min: 1 },
    meetingUrl: { type: String, default: null, trim: true },
    status: {
      type: String,
      enum: ["SCHEDULED", "COMPLETED", "CANCELLED"],
      default: "SCHEDULED",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "mentorship_sessions", timestamps: true },
);

mentorProfileSchema.index({ userId: 1 }, { unique: true });
mentorProfileSchema.index({ universityId: 1, status: 1, expertise: 1 });
mentorProfileSchema.index({
  bio: "text",
  expertise: "text",
  meetingPreferences: "text",
});
mentorshipRequestSchema.index(
  { mentorId: 1, menteeId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "PENDING" } },
);
mentorshipRequestSchema.index({ universityId: 1, mentorId: 1, status: 1 });
mentorshipRequestSchema.index({ universityId: 1, menteeId: 1, status: 1 });
mentorshipSessionSchema.index({
  mentorshipRequestId: 1,
  scheduledAt: -1,
});
mentorshipSessionSchema.index({ universityId: 1, mentorId: 1, status: 1 });
mentorshipSessionSchema.index({ universityId: 1, menteeId: 1, status: 1 });

export type MentorProfileDocument = InferSchemaType<
  typeof mentorProfileSchema
>;
export type MentorshipRequestDocument = InferSchemaType<
  typeof mentorshipRequestSchema
>;
export type MentorshipSessionDocument = InferSchemaType<
  typeof mentorshipSessionSchema
>;

export const MentorProfileModel =
  models.MentorProfile ||
  model<MentorProfileDocument>("MentorProfile", mentorProfileSchema);
export const MentorshipRequestModel =
  models.MentorshipRequest ||
  model<MentorshipRequestDocument>(
    "MentorshipRequest",
    mentorshipRequestSchema,
  );
export const MentorshipSessionModel =
  models.MentorshipSession ||
  model<MentorshipSessionDocument>(
    "MentorshipSession",
    mentorshipSessionSchema,
  );
