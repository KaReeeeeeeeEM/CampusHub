import { model, models, Schema, type InferSchemaType } from "mongoose";

const collegeSchema = new Schema(
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
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    code: {
      type: String,
      default: null,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      index: true,
    },
  },
  {
    collection: "college",
    timestamps: true,
  },
);

collegeSchema.index({ universityId: 1, slug: 1 }, { unique: true });

export type CollegeDocument = InferSchemaType<typeof collegeSchema>;

export const CollegeModel =
  models.College || model<CollegeDocument>("College", collegeSchema);
