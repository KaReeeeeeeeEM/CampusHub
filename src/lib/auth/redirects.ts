import {
  AUTH_ROUTE_PATHS,
  DEFAULT_AUTHENTICATED_REDIRECT,
} from "@/constants/routes";

function isAuthPath(pathname: string) {
  return AUTH_ROUTE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isLegacyPortalSelectionPath(pathname: string) {
  return pathname === "/portal-selection" || pathname.startsWith("/portal/");
}

export function getSafeCallbackUrl(value: string | null | undefined) {
  if (!value || value.startsWith("//")) {
    return DEFAULT_AUTHENTICATED_REDIRECT;
  }

  try {
    const url = new URL(value, "http://campushub.local");

    if (url.origin !== "http://campushub.local") {
      return DEFAULT_AUTHENTICATED_REDIRECT;
    }

    if (isAuthPath(url.pathname)) {
      return DEFAULT_AUTHENTICATED_REDIRECT;
    }

    if (isLegacyPortalSelectionPath(url.pathname)) {
      return DEFAULT_AUTHENTICATED_REDIRECT;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_AUTHENTICATED_REDIRECT;
  }
}

export function hasUnsafeCallbackUrl(value: string | null | undefined) {
  return Boolean(value) && getSafeCallbackUrl(value) !== value;
}
