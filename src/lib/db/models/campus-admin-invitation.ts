import { model, models, Schema, type InferSchemaType } from "mongoose";

const campusAdminInvitationSchema = new Schema(
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
    universityId: {
      type: String,
      required: true,
      index: true,
    },
    firstName: {
      type: String,
      default: null,
      trim: true,
    },
    lastName: {
      type: String,
      default: null,
      trim: true,
    },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "SENT", "ACCEPTED", "EXPIRED", "DISABLED"],
      default: "PENDING",
      index: true,
    },
    invitedByUserId: {
      type: String,
      required: true,
      index: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "campusAdminInvitation",
    timestamps: true,
  },
);

export type CampusAdminInvitationDocument = InferSchemaType<
  typeof campusAdminInvitationSchema
>;

export const CampusAdminInvitationModel =
  models.CampusAdminInvitation ||
  model<CampusAdminInvitationDocument>(
    "CampusAdminInvitation",
    campusAdminInvitationSchema,
  );
