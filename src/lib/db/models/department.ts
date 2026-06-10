import { model, models, Schema, type InferSchemaType } from "mongoose";

const departmentSchema = new Schema(
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
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
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
    collection: "department",
    timestamps: true,
  },
);

departmentSchema.index({ universityId: 1, code: 1 }, { unique: true });

export type DepartmentDocument = InferSchemaType<typeof departmentSchema>;

export const DepartmentModel =
  models.Department ||
  model<DepartmentDocument>("Department", departmentSchema);
