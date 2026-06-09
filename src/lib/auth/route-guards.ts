import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AUTH_ROUTES, DEFAULT_AUTHENTICATED_REDIRECT } from "@/constants/routes";
import { auth } from "@/lib/auth/auth";

export async function getServerSession() {
  return auth.api.getSession({
    headers: await headers()
  });
}

export async function requireSession() {
  const session = await getServerSession();

  if (!session) {
    redirect(AUTH_ROUTES.login);
  }

  return session;
}

export async function redirectAuthenticatedUser(
  destination = DEFAULT_AUTHENTICATED_REDIRECT
) {
  const session = await getServerSession();

  if (session) {
    redirect(destination);
  }

  return null;
}
