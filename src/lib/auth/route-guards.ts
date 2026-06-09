import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";

import {
  AUTH_ROUTES,
  DEFAULT_AUTHENTICATED_REDIRECT,
  DEFAULT_ONBOARDING_REDIRECT,
} from "@/constants/routes";
import { auth } from "@/lib/auth/auth";
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
