import { model, models, Schema, type InferSchemaType } from "mongoose";

const representativeInvitationSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    universityId: {
      type: String,
      required: true,
      index: true,
    },
    collegeId: {
      type: String,
      required: true,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      enum: ["SENT", "ACCEPTED", "EXPIRED", "DISABLED"],
      default: "SENT",
      index: true,
    },
    invitationToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
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
  },
  {
    collection: "representativeInvitation",
    timestamps: true,
  },
);

export type RepresentativeInvitationDocument = InferSchemaType<
  typeof representativeInvitationSchema
>;

export const RepresentativeInvitationModel =
  models.RepresentativeInvitation ||
  model<RepresentativeInvitationDocument>(
    "RepresentativeInvitation",
    representativeInvitationSchema,
  );
