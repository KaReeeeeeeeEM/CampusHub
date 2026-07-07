import { model, models, Schema, type InferSchemaType } from "@/lib/db/model-compat";

const sessionSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    activeOrganizationId: {
      type: String,
      default: null,
    },
    activePortal: {
      type: String,
      default: null,
    },
  },
  {
    collection: "session",
    timestamps: true,
  },
);

export type SessionDocument = InferSchemaType<typeof sessionSchema>;

export const SessionModel =
  models.Session || model<SessionDocument>("Session", sessionSchema);
