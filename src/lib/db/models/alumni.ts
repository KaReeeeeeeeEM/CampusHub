import { model, models, Schema, type InferSchemaType } from "mongoose";

import {
  metadataField,
  tenantLifecycleFields,
} from "@/lib/db/models/model-helpers";

const alumniProfileSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    graduationYear: { type: Number, required: true, index: true },
    degree: { type: String, required: true, trim: true, index: true },
    collegeId: { type: String, default: null, index: true },
    departmentId: { type: String, default: null, index: true },
    currentCompany: { type: String, default: null, trim: true, index: true },
    currentPosition: { type: String, default: null, trim: true, index: true },
    industry: { type: String, default: null, trim: true, index: true },
    location: { type: String, default: null, trim: true, index: true },
    country: { type: String, default: null, trim: true, index: true },
    bio: { type: String, default: null, trim: true },
    linkedinUrl: { type: String, default: null, trim: true },
    portfolioUrl: { type: String, default: null, trim: true },
    visibility: {
      type: String,
      enum: ["PUBLIC", "UNIVERSITY", "COLLEGE", "PRIVATE"],
      default: "UNIVERSITY",
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "HIDDEN"],
      default: "ACTIVE",
      index: true,
    },
    viewCount: { type: Number, default: 0, index: true },
    connectionCount: { type: Number, default: 0, index: true },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "alumni_profiles", timestamps: true },
);

const alumniConnectionSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    requesterId: { type: String, required: true, index: true },
    recipientId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "DECLINED", "BLOCKED"],
      default: "PENDING",
      index: true,
    },
    requestedAt: { type: Date, default: Date.now, index: true },
    respondedAt: { type: Date, default: null, index: true },
    respondedById: { type: String, default: null, index: true },
    message: { type: String, default: null, trim: true },
    metadata: metadataField,
  },
  { collection: "alumni_connections", timestamps: true },
);

alumniProfileSchema.index({ userId: 1 }, { unique: true });
alumniProfileSchema.index({ universityId: 1, visibility: 1, status: 1 });
alumniProfileSchema.index({
  universityId: 1,
  graduationYear: 1,
  collegeId: 1,
  departmentId: 1,
});
alumniProfileSchema.index({ universityId: 1, industry: 1 });
alumniProfileSchema.index({ universityId: 1, country: 1 });
alumniProfileSchema.index({
  degree: "text",
  currentCompany: "text",
  currentPosition: "text",
  industry: "text",
  location: "text",
  country: "text",
  bio: "text",
});
alumniConnectionSchema.index(
  { requesterId: 1, recipientId: 1 },
  { unique: true },
);
alumniConnectionSchema.index({ universityId: 1, status: 1, requestedAt: -1 });
alumniConnectionSchema.index({ recipientId: 1, status: 1, requestedAt: -1 });

export type AlumniProfileDocument = InferSchemaType<
  typeof alumniProfileSchema
>;
export type AlumniConnectionDocument = InferSchemaType<
  typeof alumniConnectionSchema
>;

export const AlumniProfileModel =
  models.AlumniProfile ||
  model<AlumniProfileDocument>("AlumniProfile", alumniProfileSchema);
export const AlumniConnectionModel =
  models.AlumniConnection ||
  model<AlumniConnectionDocument>(
    "AlumniConnection",
    alumniConnectionSchema,
  );
