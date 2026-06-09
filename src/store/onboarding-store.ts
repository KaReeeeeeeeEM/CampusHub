"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  defaultOnboardingData,
  type OnboardingData,
  type OnboardingRole,
  type OnboardingStep,
} from "@/features/onboarding/lib/types";

type OnboardingStore = {
  role: OnboardingRole | null;
  currentStep: OnboardingStep;
  data: OnboardingData;
  completed: boolean;
  savedAt: string | null;
  completedAt: string | null;
  hydrate: (state: {
    role: OnboardingRole | null;
    currentStep: OnboardingStep;
    data: OnboardingData;
    completed: boolean;
    savedAt: string | null;
    completedAt?: string | null;
  }) => void;
  setRole: (role: OnboardingRole) => void;
  setStep: (step: OnboardingStep) => void;
  updateRoleData: <TRole extends OnboardingRole>(
    role: TRole,
    data: Partial<OnboardingData[TRole]>,
  ) => void;
  saveProgress: () => void;
  complete: () => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      role: null,
      currentStep: "role",
      data: defaultOnboardingData,
      completed: false,
      savedAt: null,
      completedAt: null,
      hydrate: (state) =>
        set({
          role: state.role,
          currentStep: state.currentStep,
          data: state.data,
          completed: state.completed,
          savedAt: state.savedAt,
          completedAt: state.completedAt ?? null,
        }),
      setRole: (role) =>
        set({
          role,
          currentStep: "details",
          completed: false,
          completedAt: null,
          savedAt: new Date().toISOString(),
        }),
      setStep: (currentStep) => set({ currentStep }),
      updateRoleData: (role, data) =>
        set((state) => ({
          data: {
            ...state.data,
            [role]: {
              ...state.data[role],
              ...data,
            },
          },
          completed: false,
          completedAt: null,
          savedAt: new Date().toISOString(),
        })),
      saveProgress: () => set({ savedAt: new Date().toISOString() }),
      complete: () =>
        set({
          currentStep: "complete",
          completed: true,
          savedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        }),
      reset: () =>
        set({
          role: null,
          currentStep: "role",
          data: defaultOnboardingData,
          completed: false,
          savedAt: null,
          completedAt: null,
        }),
    }),
    {
      name: "campushub.onboarding",
    },
  ),
);
