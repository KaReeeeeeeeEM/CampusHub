import { model, models, Schema, type InferSchemaType } from "@/lib/db/model-compat";

import { STUDENT_LEADERSHIP_POSITIONS } from "@/features/authorization/roles";
import {
  userPositionSchema,
  userStatusSchema,
} from "@/features/auth/lib/schemas";
import { tenantLifecycleFields } from "@/lib/db/models/model-helpers";

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
    coverImage: {
      type: String,
      default: null,
      trim: true,
    },
    profileSticker: {
      type: String,
      default: null,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
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
    otherNames: {
      type: String,
      default: null,
      trim: true,
    },
    nickname: {
      type: String,
      default: null,
      trim: true,
    },
    avatar: {
      type: String,
      default: null,
      trim: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    phoneNumber: {
      type: String,
      default: null,
      trim: true,
    },
    gender: {
      type: String,
      default: null,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    bio: {
      type: String,
      default: null,
      trim: true,
    },
    studentId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    staffId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    primaryUniversityId: {
      type: String,
      default: null,
      index: true,
    },
    primaryDepartmentId: {
      type: String,
      default: null,
      index: true,
    },
    userType: {
      type: String,
      enum: ["STUDENT", "STAFF", "ADMIN", "EMPLOYER", "ALUMNI"],
      default: "STUDENT",
      index: true,
    },
    intendedRole: {
      type: String,
      default: "STUDENT",
    },
    role: {
      type: String,
      default: "STUDENT",
    },
    roles: {
      type: [String],
      default: ["STUDENT"],
      index: true,
      validate: {
        validator: (roles: string[]) => !hasEmployerRoleConflict(roles),
        message: "Employer accounts cannot hold any other CampusHub role.",
      },
    },
    permissions: {
      type: [String],
      default: [],
      index: true,
    },
    studentLeadershipPositions: {
      type: [String],
      enum: Object.values(STUDENT_LEADERSHIP_POSITIONS),
      default: [],
      index: true,
    },
    position: {
      type: String,
      enum: userPositionSchema.options,
      default: "NONE",
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
    departmentId: {
      type: String,
      default: null,
      index: true,
    },
    courseId: {
      type: String,
      default: null,
      index: true,
    },
    yearOfStudy: {
      type: Number,
      default: null,
      min: 1,
      max: 8,
      index: true,
    },
    enrollmentYear: {
      type: Number,
      default: null,
      index: true,
    },
    expectedGraduationYear: {
      type: Number,
      default: null,
      index: true,
    },
    graduatedAt: {
      type: Date,
      default: null,
      index: true,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
      index: true,
    },
    notificationPreferences: {
      streakReminders: { type: Boolean, default: true },
      eventReminders: { type: Boolean, default: true },
      communityUpdates: { type: Boolean, default: true },
      marketplaceActivity: { type: Boolean, default: true },
      projectActivity: { type: Boolean, default: true },
      badgeUnlocks: { type: Boolean, default: true },
      almanacReminders: { type: Boolean, default: true },
      mentorshipActivity: { type: Boolean, default: true },
      opportunityAlerts: { type: Boolean, default: true },
      announcements: { type: Boolean, default: true },
      pushEnabled: { type: Boolean, default: false },
      emailDigestEnabled: { type: Boolean, default: true },
    },
    profileCompletionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
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
    status: {
      type: String,
      enum: userStatusSchema.options,
      default: "PENDING",
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    ...tenantLifecycleFields,
  },
  {
    collection: "user",
    timestamps: true,
  },
);

userSchema.index({
  name: "text",
  email: "text",
  username: "text",
  firstName: "text",
  lastName: "text",
  studentId: "text",
  staffId: "text",
});
userSchema.index({
  universityId: 1,
  collegeId: 1,
  departmentId: 1,
  status: 1,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
userSchema.pre("validate", function validateEmployerRoleExclusivity(this: any) {
  if (hasEmployerRoleConflict(this.roles ?? [])) {
    throw new Error("Employer accounts cannot hold any other CampusHub role.");
  }

  if (
    this.role === "EMPLOYER" &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.roles?.some((role: any) => role !== "EMPLOYER")
  ) {
    throw new Error("Employer accounts cannot hold any other CampusHub role.");
  }
});

export type UserDocument = InferSchemaType<typeof userSchema>;

export const UserModel = models.User || model<UserDocument>("User", userSchema);
