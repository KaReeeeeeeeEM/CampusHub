import { model, models, Schema, type InferSchemaType } from "mongoose";

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
      index: true,
    },
    logoUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "ONBOARDING"],
      default: "ACTIVE",
      index: true,
    },
  },
  {
    collection: "university",
    timestamps: true,
  },
);

export type UniversityDocument = InferSchemaType<typeof universitySchema>;

export const UniversityModel =
  models.University ||
  model<UniversityDocument>("University", universitySchema);
