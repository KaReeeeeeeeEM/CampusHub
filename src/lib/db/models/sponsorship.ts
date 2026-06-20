import { model, models, Schema, type InferSchemaType } from "mongoose";

import {
  metadataField,
  tenantLifecycleFields,
} from "@/lib/db/models/model-helpers";

const moneySchema = new Schema(
  {
    amount: { type: Number, default: null, min: 0 },
    currency: { type: String, default: "TZS", uppercase: true, trim: true },
  },
  { _id: false },
);

const sponsorshipSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    sponsorshipType: {
      type: String,
      enum: [
        "SCHOLARSHIP",
        "PROJECT",
        "HACKATHON",
        "COMMUNITY",
        "RESEARCH",
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    targetEntityType: {
      type: String,
      enum: ["NONE", "PROJECT", "EVENT", "COMMUNITY", "USER", "RESEARCH"],
      default: "NONE",
      index: true,
    },
    targetEntityId: { type: String, default: null, index: true },
    requestedById: { type: String, required: true, index: true },
    sponsorId: { type: String, default: null, index: true },
    sponsorName: { type: String, default: null, trim: true, index: true },
    requestedAmount: { type: moneySchema, default: () => ({}) },
    committedAmount: { type: moneySchema, default: () => ({}) },
    benefits: { type: [String], default: [] },
    eligibility: { type: Schema.Types.Mixed, default: null },
    applicationDeadline: { type: Date, default: null, index: true },
    startsAt: { type: Date, default: null, index: true },
    endsAt: { type: Date, default: null, index: true },
    visibility: {
      type: String,
      enum: ["PUBLIC", "UNIVERSITY", "PRIVATE"],
      default: "UNIVERSITY",
      index: true,
    },
    status: {
      type: String,
      enum: [
        "DRAFT",
        "OPEN",
        "UNDER_REVIEW",
        "APPROVED",
        "ACTIVE",
        "COMPLETED",
        "CANCELLED",
        "REJECTED",
        "ARCHIVED",
      ],
      default: "DRAFT",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "sponsorships", timestamps: true },
);

const sponsorshipInterestSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    sponsorshipId: { type: String, required: true, index: true },
    sponsorId: { type: String, required: true, index: true },
    sponsorName: { type: String, default: null, trim: true },
    message: { type: String, default: null, trim: true },
    proposedAmount: { type: moneySchema, default: () => ({}) },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "DECLINED", "WITHDRAWN"],
      default: "PENDING",
      index: true,
    },
    reviewedById: { type: String, default: null, index: true },
    reviewedAt: { type: Date, default: null, index: true },
    metadata: metadataField,
  },
  { collection: "sponsorship_interests", timestamps: true },
);

sponsorshipSchema.index({ universityId: 1, sponsorshipType: 1, status: 1 });
sponsorshipSchema.index({ universityId: 1, visibility: 1, status: 1 });
sponsorshipSchema.index({ targetEntityType: 1, targetEntityId: 1 });
sponsorshipSchema.index({ requestedById: 1, status: 1, createdAt: -1 });
sponsorshipSchema.index({ sponsorId: 1, status: 1, createdAt: -1 });
sponsorshipSchema.index({ title: "text", description: "text", sponsorName: "text" });
sponsorshipInterestSchema.index(
  { sponsorshipId: 1, sponsorId: 1 },
  { unique: true },
);
sponsorshipInterestSchema.index({ universityId: 1, status: 1, createdAt: -1 });
sponsorshipInterestSchema.index({ sponsorId: 1, status: 1, createdAt: -1 });

export type SponsorshipDocument = InferSchemaType<typeof sponsorshipSchema>;
export type SponsorshipInterestDocument = InferSchemaType<
  typeof sponsorshipInterestSchema
>;

export const SponsorshipModel =
  models.Sponsorship ||
  model<SponsorshipDocument>("Sponsorship", sponsorshipSchema);
export const SponsorshipInterestModel =
  models.SponsorshipInterest ||
  model<SponsorshipInterestDocument>(
    "SponsorshipInterest",
    sponsorshipInterestSchema,
  );
