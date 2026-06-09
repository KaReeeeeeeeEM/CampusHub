import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from "@/lib/db/prisma";

function getAuthBaseUrl() {
  return (
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}

export const auth = betterAuth({
  appName: "CampusHub",
  baseURL: getAuthBaseUrl(),
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "campushub-development-secret-replace-before-production",
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"],
  user: {
    additionalFields: {
      intendedRole: {
        type: "string",
        required: false,
        input: true,
        returned: true
      }
    }
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url, token }) => {
      const resetUrl = new URL("/reset-password", getAuthBaseUrl());
      resetUrl.searchParams.set("token", token);

      console.info("CampusHub password reset requested", {
        email: user.email,
        url,
        resetUrl: resetUrl.toString()
      });
    }
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: false,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url, token }) => {
      const verificationUrl = new URL("/verify-email", getAuthBaseUrl());
      verificationUrl.searchParams.set("token", token);

      console.info("CampusHub verification email requested", {
        email: user.email,
        url,
        verificationUrl: verificationUrl.toString()
      });
    }
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60
    }
  }
});
