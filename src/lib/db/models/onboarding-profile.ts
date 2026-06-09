import { model, models, Schema, type InferSchemaType } from "mongoose";

import { ONBOARDING_ROLES } from "@/features/onboarding/lib/types";

const onboardingProfileSchema = new Schema(
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
    role: {
      type: String,
      enum: ONBOARDING_ROLES,
      default: null,
      index: true,
    },
    currentStep: {
      type: String,
      enum: ["role", "details", "review", "complete"],
      default: "role",
      index: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    savedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    collection: "onboardingProfile",
    timestamps: true,
  },
);

export type OnboardingProfileDocument = InferSchemaType<
  typeof onboardingProfileSchema
>;

export const OnboardingProfileModel =
  models.OnboardingProfile ||
  model<OnboardingProfileDocument>(
    "OnboardingProfile",
    onboardingProfileSchema,
  );
