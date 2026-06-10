import { model, models, Schema, type InferSchemaType } from "mongoose";

import {
  ROLES,
  STUDENT_LEADERSHIP_POSITIONS,
} from "@/features/authorization/roles";

function hasEmployerRoleConflict(roles: string[]) {
  return (
    roles.includes("EMPLOYER") && roles.some((role) => role !== "EMPLOYER")
  );
}

const userSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    image: {
      type: String,
      default: null,
    },
    intendedRole: {
      type: String,
      enum: Object.values(ROLES),
      default: "STUDENT",
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: "STUDENT",
    },
    roles: {
      type: [String],
      enum: Object.values(ROLES),
      default: ["STUDENT"],
      index: true,
      validate: {
        validator: (roles: string[]) => !hasEmployerRoleConflict(roles),
        message: "Employer accounts cannot hold any other CampusHub role.",
      },
    },
    studentLeadershipPositions: {
      type: [String],
      enum: Object.values(STUDENT_LEADERSHIP_POSITIONS),
      default: [],
      index: true,
    },
    universityId: {
      type: String,
      default: null,
      index: true,
    },
    collegeId: {
      type: String,
      default: null,
      index: true,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastUsedPortal: {
      type: String,
      default: null,
    },
  },
  {
    collection: "user",
    timestamps: true,
  },
);

userSchema.pre("validate", function validateEmployerRoleExclusivity() {
  if (hasEmployerRoleConflict(this.roles ?? [])) {
    throw new Error("Employer accounts cannot hold any other CampusHub role.");
  }

  if (
    this.role === "EMPLOYER" &&
    this.roles?.some((role) => role !== "EMPLOYER")
  ) {
    throw new Error("Employer accounts cannot hold any other CampusHub role.");
  }
});

export type UserDocument = InferSchemaType<typeof userSchema>;

export const UserModel = models.User || model<UserDocument>("User", userSchema);
