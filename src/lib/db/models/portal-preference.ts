import { model, models, Schema, type InferSchemaType } from "mongoose";

const portalKeys = [
  "student",
  "teacher",
  "representative",
  "campus-admin",
  "alumni",
  "employer",
] as const;

const portalPreferenceSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lastUsedPortal: {
      type: String,
      enum: portalKeys,
      default: null,
    },
    defaultPortal: {
      type: String,
      enum: portalKeys,
      default: null,
    },
    quickAccess: {
      type: [String],
      enum: portalKeys,
      default: [],
    },
    selectedPortal: {
      type: String,
      enum: portalKeys,
      default: null,
    },
    selectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "portalPreference",
    timestamps: true,
  },
);

export type PortalPreferenceDocument = InferSchemaType<
  typeof portalPreferenceSchema
>;

export const PortalPreferenceModel =
  models.PortalPreference ||
  model<PortalPreferenceDocument>(
    "PortalPreference",
    portalPreferenceSchema,
  );
