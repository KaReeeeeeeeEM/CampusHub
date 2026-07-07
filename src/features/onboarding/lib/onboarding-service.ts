import { randomUUID } from "node:crypto";

import { headers } from "next/headers";

import {
  defaultOnboardingData,
  type OnboardingData,
  type OnboardingRole,
  type OnboardingStep,
} from "@/features/onboarding/lib/types";
import type {
  CompleteOnboardingInput,
  SaveOnboardingInput,
} from "@/features/onboarding/lib/schemas";
import { auth } from "@/lib/auth/auth";
import { connectPostgres } from "@/lib/db/postgres";
import { OnboardingProfileModel, UserModel } from "@/lib/db/models";
import type { AuthSession } from "@/types/auth";

export type OnboardingState = {
  role: OnboardingRole | null;
  currentStep: OnboardingStep;
  data: OnboardingData;
  completed: boolean;
  savedAt: string | null;
  completedAt: string | null;
};

async function getAuthenticatedSession() {
  const session = (await auth.api.getSession({
    headers: await headers(),
    query: {
      disableCookieCache: true,
    },
  })) as AuthSession | null;

  if (!session) {
    throw new Error("Authentication required.");
  }

  return session;
}

function mergeWithDefaultData(data: unknown): OnboardingData {
  const incoming =
    data && typeof data === "object" ? (data as Partial<OnboardingData>) : {};

  return {
    STUDENT: {
      ...defaultOnboardingData.STUDENT,
      ...incoming.STUDENT,
    },
    TEACHER: {
      ...defaultOnboardingData.TEACHER,
      ...incoming.TEACHER,
    },
    REPRESENTATIVE: {
      ...defaultOnboardingData.REPRESENTATIVE,
      ...incoming.REPRESENTATIVE,
    },
    CAMPUS_ADMIN: {
      ...defaultOnboardingData.CAMPUS_ADMIN,
      ...incoming.CAMPUS_ADMIN,
    },
    ALUMNI: {
      ...defaultOnboardingData.ALUMNI,
      ...incoming.ALUMNI,
    },
    EMPLOYER: {
      ...defaultOnboardingData.EMPLOYER,
      ...incoming.EMPLOYER,
    },
  };
}

function serializeOnboarding(record: {
  role?: OnboardingRole | null;
  currentStep?: OnboardingStep | null;
  data?: unknown;
  completed?: boolean | null;
  savedAt?: Date | string | null;
  completedAt?: Date | string | null;
}): OnboardingState {
  return {
    role: record.role ?? null,
    currentStep: record.currentStep ?? "role",
    data: mergeWithDefaultData(record.data),
    completed: Boolean(record.completed),
    savedAt: record.savedAt ? new Date(record.savedAt).toISOString() : null,
    completedAt: record.completedAt
      ? new Date(record.completedAt).toISOString()
      : null,
  };
}

export async function getOnboardingProgress() {
  const session = await getAuthenticatedSession();
  await connectPostgres();

  const record = await OnboardingProfileModel.findOne({
    userId: session.user.id,
  }).lean();

  if (!record) {
    return serializeOnboarding({
      data: defaultOnboardingData,
      role: null,
      currentStep: "role",
      completed: false,
      savedAt: null,
      completedAt: null,
    });
  }

  return serializeOnboarding(record as Parameters<typeof serializeOnboarding>[0]);
}

export async function saveOnboardingProgress(input: SaveOnboardingInput) {
  const session = await getAuthenticatedSession();
  await connectPostgres();

  const now = new Date();

  const record = await OnboardingProfileModel.findOneAndUpdate(
    { userId: session.user.id },
    {
      $set: {
        role: input.role,
        currentStep: input.currentStep,
        data: input.data,
        completed: false,
        savedAt: now,
        completedAt: null,
      },
      $setOnInsert: {
        _id: randomUUID(),
        userId: session.user.id,
      },
    },
    { new: true, upsert: true },
  ).lean();

  await UserModel.updateOne(
    { _id: session.user.id },
    { $set: { onboardingCompleted: false } },
  );

  return serializeOnboarding(record as Parameters<typeof serializeOnboarding>[0]);
}

export async function completeOnboarding(input: CompleteOnboardingInput) {
  const session = await getAuthenticatedSession();
  await connectPostgres();

  const now = new Date();

  const record = await OnboardingProfileModel.findOneAndUpdate(
    { userId: session.user.id },
    {
      $set: {
        role: input.role,
        currentStep: "complete",
        data: input.data,
        completed: true,
        savedAt: now,
        completedAt: now,
      },
      $setOnInsert: {
        _id: randomUUID(),
        userId: session.user.id,
      },
    },
    { new: true, upsert: true },
  ).lean();

  await UserModel.updateOne(
    { _id: session.user.id },
    {
      $set: {
        onboardingCompleted: true,
        role: input.role,
        roles: [input.role],
      },
    },
  );

  return serializeOnboarding(record as Parameters<typeof serializeOnboarding>[0]);
}
