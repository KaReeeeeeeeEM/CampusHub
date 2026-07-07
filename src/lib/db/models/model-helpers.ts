import { Schema } from "@/lib/db/model-compat";

export const VISIBILITY_VALUES = [
  "PRIVATE",
  "TEAM",
  "DEPARTMENT",
  "COLLEGE",
  "UNIVERSITY",
  "PUBLIC",
  "ROLE_BASED",
] as const;

export const RECORD_STATUS_VALUES = [
  "DRAFT",
  "PENDING",
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
  "SUSPENDED",
  "DELETED",
] as const;

export const tenantLifecycleFields = {
  createdById: {
    type: String,
    default: null,
    index: true,
  },
  updatedById: {
    type: String,
    default: null,
  },
  deletedAt: {
    type: Date,
    default: null,
    index: true,
  },
  deletedById: {
    type: String,
    default: null,
  },
  deleteReason: {
    type: String,
    default: null,
    trim: true,
  },
} as const;

export const tenantLifecycleFieldsWithoutCreator = {
  updatedById: tenantLifecycleFields.updatedById,
  deletedAt: tenantLifecycleFields.deletedAt,
  deletedById: tenantLifecycleFields.deletedById,
  deleteReason: tenantLifecycleFields.deleteReason,
} as const;

export const visibilityField = {
  type: String,
  enum: VISIBILITY_VALUES,
  default: "UNIVERSITY",
  index: true,
} as const;

export const metadataField = {
  type: Schema.Types.Mixed,
  default: null,
} as const;

export const attachmentSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      default: null,
      trim: true,
    },
    fileSize: {
      type: Number,
      default: null,
    },
  },
  { _id: false },
);

export const targetAudienceSchema = new Schema(
  {
    universityWide: {
      type: Boolean,
      default: true,
    },
    collegeIds: {
      type: [String],
      default: [],
      index: true,
    },
    departmentIds: {
      type: [String],
      default: [],
      index: true,
    },
    roles: {
      type: [String],
      default: [],
      index: true,
    },
    yearsOfStudy: {
      type: [String],
      default: [],
    },
    programs: {
      type: [String],
      default: [],
    },
  },
  { _id: false },
);
