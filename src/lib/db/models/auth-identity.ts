import { model, models, Schema, type InferSchemaType } from "mongoose";

import {
  metadataField,
  tenantLifecycleFields,
} from "@/lib/db/models/model-helpers";

const accountSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    accountId: {
      type: String,
      required: true,
      trim: true,
    },
    providerId: {
      type: String,
      required: true,
      trim: true,
    },
    accessToken: {
      type: String,
      default: null,
    },
    refreshToken: {
      type: String,
      default: null,
    },
    accessTokenExpiresAt: {
      type: Date,
      default: null,
    },
    refreshTokenExpiresAt: {
      type: Date,
      default: null,
    },
    scope: {
      type: String,
      default: null,
    },
    idToken: {
      type: String,
      default: null,
    },
    password: {
      type: String,
      default: null,
    },
    metadata: metadataField,
  },
  {
    collection: "account",
    timestamps: true,
  },
);

const verificationSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    identifier: {
      type: String,
      required: true,
      index: true,
    },
    value: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    collection: "verification",
    timestamps: true,
  },
);

const userMembershipSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
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
    positionId: {
      type: String,
      default: null,
      index: true,
    },
    roles: {
      type: [String],
      default: [],
      index: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    membershipType: {
      type: String,
      enum: ["STUDENT", "LECTURER", "STAFF", "ADMIN", "EMPLOYER", "ALUMNI"],
      required: true,
      index: true,
    },
    yearOfStudy: {
      type: String,
      default: null,
      trim: true,
    },
    program: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    enrollmentStatus: {
      type: String,
      enum: ["ACTIVE", "DEFERRED", "GRADUATED", "WITHDRAWN", "SUSPENDED"],
      default: "ACTIVE",
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "PENDING", "SUSPENDED", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  {
    collection: "user_memberships",
    timestamps: true,
  },
);

accountSchema.index({ providerId: 1, accountId: 1 }, { unique: true });
verificationSchema.index({ identifier: 1, value: 1 }, { unique: true });
verificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
userMembershipSchema.index(
  { userId: 1, universityId: 1, departmentId: 1, membershipType: 1 },
  { unique: true },
);
userMembershipSchema.index({ universityId: 1, roles: 1, status: 1 });
userMembershipSchema.index({ universityId: 1, departmentId: 1, status: 1 });
userMembershipSchema.index({ universityId: 1, deletedAt: 1 });

export type AccountDocument = InferSchemaType<typeof accountSchema>;
export type VerificationDocument = InferSchemaType<typeof verificationSchema>;
export type UserMembershipDocument = InferSchemaType<
  typeof userMembershipSchema
>;

export const AccountModel =
  models.Account || model<AccountDocument>("Account", accountSchema);
export const VerificationModel =
  models.Verification ||
  model<VerificationDocument>("Verification", verificationSchema);
export const UserMembershipModel =
  models.UserMembership ||
  model<UserMembershipDocument>("UserMembership", userMembershipSchema);
