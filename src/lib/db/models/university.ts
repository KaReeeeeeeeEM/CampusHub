import { model, models, Schema, type InferSchemaType } from "mongoose";

import {
  metadataField,
  tenantLifecycleFields,
} from "@/lib/db/models/model-helpers";

const universitySchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    shortName: {
      type: String,
      default: null,
      trim: true,
    },
    logo: {
      type: String,
      default: null,
      trim: true,
    },
    coverImage: {
      type: String,
      default: null,
      trim: true,
    },
    country: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    region: {
      type: String,
      default: null,
      trim: true,
    },
    website: {
      type: String,
      default: null,
      trim: true,
    },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    locationName: {
      type: String,
      default: null,
      trim: true,
    },
    locationAddress: {
      type: String,
      default: null,
      trim: true,
    },
    locationLatitude: {
      type: Number,
      default: null,
      min: -90,
      max: 90,
    },
    locationLongitude: {
      type: Number,
      default: null,
      min: -180,
      max: 180,
    },
    locationSource: {
      type: String,
      enum: ["OPENSTREETMAP", "OPENAI_WEB", "MANUAL", null],
      default: null,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    domain: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    city: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    timezone: {
      type: String,
      default: null,
      trim: true,
    },
    contactEmail: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    subscriptionPlan: {
      type: String,
      default: "FREE",
      trim: true,
      index: true,
    },
    subscriptionStatus: {
      type: String,
      enum: ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED", "SUSPENDED"],
      default: "TRIAL",
      index: true,
    },
    settings: metadataField,
    logoUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "PENDING"],
      default: "ACTIVE",
      index: true,
    },
    ...tenantLifecycleFields,
  },
  {
    collection: "university",
    timestamps: true,
  },
);

universitySchema.index(
  { domain: 1 },
  { unique: true, partialFilterExpression: { domain: { $type: "string" } } },
);
universitySchema.index({ slug: 1, status: 1 });

export type UniversityDocument = InferSchemaType<typeof universitySchema>;

export const UniversityModel =
  models.University ||
  model<UniversityDocument>("University", universitySchema);
