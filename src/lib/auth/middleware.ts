import { NextResponse, type NextRequest } from "next/server";

import { AUTH_ROUTES } from "@/constants/routes";

const PUBLIC_PATHS = [
  "/",
  "/about",
  "/features",
  "/universities",
  "/employers",
  "/alumni",
  "/pricing",
  "/contact",
  "/faq",
  "/join",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verification-success",
  "/api/auth"
];
const PROTECTED_PREFIXES = ["/portal", "/dashboard", "/onboarding", "/student"];

export function withAuthGuard(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isPublic || !isProtected) {
    return NextResponse.next();
  }

  const hasSessionCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes("better-auth"));

  if (!hasSessionCookie) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = AUTH_ROUTES.login;
    signInUrl.searchParams.set("callbackUrl", pathname);

    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}
