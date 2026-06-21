"use client";

import { create } from "zustand";

import type { AuthUser } from "@/types/auth";

type UserState = {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  clearUser: () => void;
};

function sameStringArray(left?: string[], right?: string[]) {
  if (left === right) {
    return true;
  }

  if (!left || !right || left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => item === right[index]);
}

function sameUser(left: AuthUser | null, right: AuthUser | null) {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.id === right.id &&
    left.name === right.name &&
    left.email === right.email &&
    left.image === right.image &&
    left.avatar === right.avatar &&
    left.role === right.role &&
    left.universityId === right.universityId &&
    left.collegeId === right.collegeId &&
    left.departmentId === right.departmentId &&
    left.onboardingCompleted === right.onboardingCompleted &&
    sameStringArray(left.roles, right.roles) &&
    sameStringArray(left.permissions, right.permissions)
  );
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) =>
    set((state) => (sameUser(state.user, user) ? state : { user })),
  clearUser: () =>
    set((state) => (state.user === null ? state : { user: null })),
}));
