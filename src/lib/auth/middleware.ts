import { NextResponse, type NextRequest } from "next/server";

import {
  APP_ROUTE_PREFIXES,
  AUTH_ROUTES,
  AUTH_ROUTE_PATHS,
  DEFAULT_AUTHENTICATED_REDIRECT,
  ONBOARDING_ROUTE_PREFIXES,
  PORTAL_ROUTE_PREFIXES,
  PUBLIC_ROUTES,
} from "@/constants/routes";
import { getSafeCallbackUrl, hasUnsafeCallbackUrl } from "@/lib/auth/redirects";

function matchesPath(pathname: string, paths: readonly string[]) {
  return paths.some(
    (path) =>
      pathname === path || (path !== "/" && pathname.startsWith(`${path}/`)),
  );
}

function hasBetterAuthSessionCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.includes("better-auth") ||
        cookie.name.includes("campushub"),
    );
}

function redirectTo(
  request: NextRequest,
  pathname: string,
  callbackUrl?: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;

  if (callbackUrl) {
    url.searchParams.set("callbackUrl", callbackUrl);
  } else {
    url.searchParams.delete("callbackUrl");
  }

  return NextResponse.redirect(url);
}

export function withAuthGuard(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const isAuthRoute = matchesPath(pathname, AUTH_ROUTE_PATHS);
  const isPublicRoute = matchesPath(pathname, PUBLIC_ROUTES);
  const isOnboardingRoute = matchesPath(pathname, ONBOARDING_ROUTE_PREFIXES);
  const isPortalRoute = matchesPath(pathname, PORTAL_ROUTE_PREFIXES);
  const isAppRoute = matchesPath(pathname, APP_ROUTE_PREFIXES);
  const hasSessionCookie = hasBetterAuthSessionCookie(request);
  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");

  if (isAuthRoute && hasUnsafeCallbackUrl(callbackUrl)) {
    return redirectTo(
      request,
      pathname,
      getSafeCallbackUrl(callbackUrl) === DEFAULT_AUTHENTICATED_REDIRECT
        ? undefined
        : getSafeCallbackUrl(callbackUrl),
    );
  }

  if (isAuthRoute && hasSessionCookie) {
    return redirectTo(request, DEFAULT_AUTHENTICATED_REDIRECT);
  }

  if (isAuthRoute) {
    return NextResponse.next();
  }

  if (
    isPublicRoute ||
    (!isAuthRoute && !isOnboardingRoute && !isPortalRoute && !isAppRoute)
  ) {
    return NextResponse.next();
  }

  if (!hasSessionCookie) {
    return redirectTo(request, AUTH_ROUTES.login, pathname);
  }

  return NextResponse.next();
}
