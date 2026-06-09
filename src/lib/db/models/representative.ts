import { model, models, Schema, type InferSchemaType } from "mongoose";

const representativeSchema = new Schema(
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
    title: {
      type: String,
      default: "College Representative",
      trim: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "INACTIVE"],
      default: "ACTIVE",
      index: true,
    },
  },
  {
    collection: "representative",
    timestamps: true,
  },
);

export type RepresentativeDocument = InferSchemaType<
  typeof representativeSchema
>;

export const RepresentativeModel =
  models.Representative ||
  model<RepresentativeDocument>("Representative", representativeSchema);
