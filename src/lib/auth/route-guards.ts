import { cookies, headers } from "next/headers";
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
import {
  DEV_ROLE_PREVIEW_COOKIE,
  isRolePreviewKey,
} from "@/features/development/role-preview";
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
  return Boolean(session?.user.onboardingCompleted);
}

export function getAuthenticatedRedirect(session: AuthSession) {
  return isOnboardingComplete(session)
    ? DEFAULT_AUTHENTICATED_REDIRECT
    : DEFAULT_ONBOARDING_REDIRECT;
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

async function getDevelopmentPreviewKey(session: AuthSession) {
  if (
    process.env.NODE_ENV === "production" ||
    !hasRole(session.user.role, ["SUPER_ADMIN"], session.user.roles)
  ) {
    return null;
  }

  const preview = (await cookies()).get(DEV_ROLE_PREVIEW_COOKIE)?.value;

  return isRolePreviewKey(preview) ? preview : null;
}

export async function requireStudentLeadershipPosition(
  position: StudentLeadershipPosition,
) {
  const session = (await requireCompletedOnboarding()) as AuthSession;
  const preview = await getDevelopmentPreviewKey(session);

  if (preview === position) {
    return session;
  }

  if (!hasRole(session.user.role, ["STUDENT"], session.user.roles)) {
    redirect(DEFAULT_AUTHENTICATED_REDIRECT);
  }

  if (!getSessionLeadershipPositions(session).includes(position)) {
    redirect("/student/dashboard");
  }

  return session;
}
