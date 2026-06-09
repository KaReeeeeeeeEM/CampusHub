export const AUTH_ROUTES = {
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyEmail: "/verify-email",
  verificationSuccess: "/verification-success"
} as const;

export const DEFAULT_AUTHENTICATED_REDIRECT = "/portal-selection";
