"use client";

import { createContext, useContext, useEffect, useMemo } from "react";

import {
  ROLES,
  isLegacyStudentLeadershipRoleKey,
  isStudentLeadershipPosition,
  type RoleKey,
  type StudentLeadershipPosition,
} from "@/features/authorization/roles";
import { authClient } from "@/lib/auth/client";
import { useUserStore } from "@/store/user-store";
import type { AuthUser } from "@/types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isPending: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isPending: true,
});

type AuthProviderProps = {
  children: React.ReactNode;
};

type SessionUser = {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
  role?: string | null;
  roles?: string[] | null;
  permissions?: string[] | null;
  studentLeadershipPositions?: string[] | null;
  universityId?: string | null;
  collegeId?: string | null;
  departmentId?: string | null;
  onboardingCompleted?: boolean | null;
};

function normalizeRole(value?: string | null): RoleKey {
  return value && value in ROLES ? (value as RoleKey) : "STUDENT";
}

function normalizeRoles(user: SessionUser) {
  const roles = user.roles?.filter((role): role is RoleKey => role in ROLES);
  return roles?.length ? roles : [normalizeRole(user.role)];
}

function normalizeStudentLeadershipPositions(user: SessionUser) {
  const explicit =
    user.studentLeadershipPositions
      ?.filter(isStudentLeadershipPosition) ?? [];
  const legacy = [user.role, ...(user.roles ?? [])]
    .filter(isLegacyStudentLeadershipRoleKey)
    .filter(isStudentLeadershipPosition);

  return Array.from(new Set([...explicit, ...legacy]));
}

function utcDateKey() {
  return new Date().toISOString().slice(0, 10);
}

export function AuthProvider({ children }: AuthProviderProps) {
  const session = authClient.useSession();
  const storedUser = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    const sessionUser = session.data?.user as SessionUser | undefined;

    if (!sessionUser) {
      setUser(null);
      return;
    }

    setUser({
      id: sessionUser.id,
      name: sessionUser.name ?? null,
      email: sessionUser.email,
      image: sessionUser.image,
      role: normalizeRole(sessionUser.role),
      roles: normalizeRoles(sessionUser),
      permissions: sessionUser.permissions ?? [],
      studentLeadershipPositions: normalizeStudentLeadershipPositions(
        sessionUser,
      ) as StudentLeadershipPosition[],
      universityId: sessionUser.universityId ?? null,
      collegeId: sessionUser.collegeId ?? null,
      departmentId: sessionUser.departmentId ?? null,
      onboardingCompleted: Boolean(sessionUser.onboardingCompleted),
    });
  }, [session.data?.user, setUser]);

  useEffect(() => {
    const sessionUser = session.data?.user as SessionUser | undefined;

    if (!sessionUser?.id || typeof window === "undefined") {
      return;
    }

    const storageKey = `campushub:daily-login-streak:${sessionUser.id}:${utcDateKey()}`;

    if (window.localStorage.getItem(storageKey)) {
      return;
    }

    async function recordDailyLogin() {
      try {
        const response = await fetch("/api/streaks/activity", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            streakType: "DAILY_LOGIN",
          }),
        });

        if (response.ok) {
          window.localStorage.setItem(storageKey, "recorded");
          window.dispatchEvent(new CustomEvent("campushub:streak-updated"));
        }
      } catch {
        return;
      }
    }

    void recordDailyLogin();
  }, [session.data?.user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: storedUser,
      isAuthenticated: Boolean(storedUser),
      isPending: session.isPending,
    }),
    [session.isPending, storedUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
