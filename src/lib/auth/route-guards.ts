import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";

import {
  AUTH_ROUTES,
  DEFAULT_AUTHENTICATED_REDIRECT,
  DEFAULT_ONBOARDING_REDIRECT,
} from "@/constants/routes";
import { auth } from "@/lib/auth/auth";
import type { RoleKey } from "@/features/authorization/roles";
import {
  isLegacyStudentLeadershipRoleKey,
  isStudentLeadershipPosition,
  type StudentLeadershipPosition,
} from "@/features/authorization/roles";
import { hasRole } from "@/features/authorization/rbac";
import { getSessionLandingPath } from "@/lib/auth/role-redirect";
import type { AuthSession } from "@/types/auth";

export async function getServerSession() {
  return auth.api.getSession({
    headers: await headers(),
    query: {
      disableCookieCache: true,
    },
  });
}

export async function requireSession() {
  const session = await getServerSession();

  if (!session) {
    redirect(AUTH_ROUTES.login);
  }

  return session;
}

export function isOnboardingComplete(session: AuthSession | null | undefined) {
  return Boolean(session);
}

export function getAuthenticatedRedirect(session: AuthSession) {
  return getSessionLandingPath(session);
}

export async function redirectAuthenticatedUser(destination?: string) {
  let session: AuthSession | null = null;

  try {
    session = (await getServerSession()) as AuthSession | null;
  } catch (error) {
    unstable_rethrow(error);
    console.warn("Unable to resolve auth session for auth route.", error);
    return null;
  }

  if (session) {
    redirect(destination ?? getAuthenticatedRedirect(session));
  }

  return null;
}

export async function requireOnboarding() {
  const session = (await requireSession()) as AuthSession;

  if (isOnboardingComplete(session)) {
    redirect(DEFAULT_AUTHENTICATED_REDIRECT);
  }

  return session;
}

export async function requireCompletedOnboarding() {
  const session = (await requireSession()) as AuthSession;

  if (!isOnboardingComplete(session)) {
    redirect(DEFAULT_ONBOARDING_REDIRECT);
  }

  return session;
}

export async function requireRole(allowedRoles: RoleKey[]) {
  const session = (await requireSession()) as AuthSession;

  if (!hasRole(session.user.role, allowedRoles, session.user.roles)) {
    redirect(DEFAULT_AUTHENTICATED_REDIRECT);
  }

  return session;
}

function getSessionLeadershipPositions(session: AuthSession) {
  const explicit =
    session.user.studentLeadershipPositions?.filter(
      isStudentLeadershipPosition,
    ) ?? [];
  const legacy =
    session.user.roles
      ?.filter(isLegacyStudentLeadershipRoleKey)
      .filter(isStudentLeadershipPosition) ?? [];

  return Array.from(new Set([...explicit, ...legacy]));
}

export async function requireStudentLeadershipPosition(
  position: StudentLeadershipPosition,
) {
  const session = (await requireSession()) as AuthSession;

  if (!hasRole(session.user.role, ["STUDENT"], session.user.roles)) {
    redirect(DEFAULT_AUTHENTICATED_REDIRECT);
  }

  if (!getSessionLeadershipPositions(session).includes(position)) {
    redirect("/student/dashboard");
  }

  return session;
}
