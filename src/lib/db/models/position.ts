import { model, models, Schema, type InferSchemaType } from "@/lib/db/model-compat";

import {
  metadataField,
  tenantLifecycleFields,
} from "@/lib/db/models/model-helpers";

const positionSchema = new Schema(
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
      default: null,
      index: true,
    },
    departmentId: {
      type: String,
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    parentPositionId: {
      type: String,
      default: null,
      index: true,
    },
    roleType: {
      type: String,
      enum: ["ACADEMIC", "ADMINISTRATIVE", "STUDENT_LEADERSHIP", "SYSTEM"],
      default: "ADMINISTRATIVE",
      index: true,
    },
    level: {
      type: String,
      enum: ["UNIVERSITY", "COLLEGE", "DEPARTMENT", "CLASS", "COMMITTEE"],
      required: true,
      index: true,
    },
    committeeId: {
      type: String,
      default: null,
      index: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  {
    collection: "positions",
    timestamps: true,
  },
);

positionSchema.index({ universityId: 1, level: 1, status: 1 });
positionSchema.index({ universityId: 1, parentPositionId: 1, status: 1 });
positionSchema.index({ universityId: 1, departmentId: 1, status: 1 });
positionSchema.index({ universityId: 1, committeeId: 1, status: 1 });
positionSchema.index({ name: "text", title: "text", description: "text" });

export type PositionDocument = InferSchemaType<typeof positionSchema>;

export const PositionModel =
  models.Position || model<PositionDocument>("Position", positionSchema);
