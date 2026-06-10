export const AUTH_ROUTES = {
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyEmail: "/verify-email",
  verificationSuccess: "/verification-success",
} as const;

export const PUBLIC_ROUTES = [
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
  "/join-university",
  "/request-university",
] as const;

export const AUTH_ROUTE_PATHS = Object.values(AUTH_ROUTES);

export const ONBOARDING_ROUTE_PREFIXES = ["/onboarding"] as const;
export const PORTAL_ROUTE_PREFIXES = ["/portal-selection"] as const;
export const APP_ROUTE_PREFIXES = [
  "/student",
  "/dashboard",
  "/portal",
  "/representative",
  "/committee-member",
  "/super-admin",
] as const;

export const DEFAULT_AUTHENTICATED_REDIRECT = "/portal-selection";
export const DEFAULT_ONBOARDING_REDIRECT = "/onboarding";
