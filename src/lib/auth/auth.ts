import { APIError, betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { randomUUID } from "node:crypto";

import {
  deleteAuthSession,
  ensureSystemRoles,
  noteUserLogin,
  syncAuthSession,
  syncAuthUser,
} from "@/lib/auth/user-sync";
import { getMongoNativeClient, getMongoNativeDb } from "@/lib/db/mongodb";

function getAuthBaseUrl() {
  return (
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}

export function getAcquisitionSecret() {
  return (
    process.env.CAMPUSHUB_ACQUISITION_SECRET ??
    "campushub-development-acquisition-secret"
  );
}

function isAllowedAcquisitionSourceForRole(source: string, role: string) {
  const sourceRoleMap: Record<string, string> = {
    STUDENT_INVITATION: "STUDENT",
    TEACHER_INVITATION: "TEACHER",
    REPRESENTATIVE_INVITATION: "REPRESENTATIVE",
    CAMPUS_ADMIN_INVITATION: "CAMPUS_ADMIN",
    EMPLOYER_ACTIVATION: "EMPLOYER",
  };

  return sourceRoleMap[source] === role;
}

export const auth = betterAuth({
  appName: "CampusHub",
  baseURL: getAuthBaseUrl(),
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "campushub-development-secret-replace-before-production",
  database: mongodbAdapter(getMongoNativeDb(), {
    client: getMongoNativeClient(),
    transaction: false,
  }),
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"],
  advanced: {
    database: {
      generateId: () => randomUUID(),
    },
  },
  user: {
    additionalFields: {
      acquisitionSource: {
        type: "string",
        required: false,
        input: true,
        returned: false,
      },
      acquisitionToken: {
        type: "string",
        required: false,
        input: true,
        returned: false,
      },
      intendedRole: {
        type: "string",
        required: false,
        input: true,
        returned: true,
        defaultValue: "STUDENT",
      },
      role: {
        type: "string",
        required: false,
        input: false,
        returned: true,
        defaultValue: "STUDENT",
      },
      roles: {
        type: "string[]",
        required: false,
        input: false,
        returned: true,
        defaultValue: ["STUDENT"],
      },
      universityId: {
        type: "string",
        required: false,
        input: true,
        returned: true,
      },
      collegeId: {
        type: "string",
        required: false,
        input: true,
        returned: true,
      },
      onboardingCompleted: {
        type: "boolean",
        required: false,
        input: false,
        returned: true,
        defaultValue: false,
      },
    },
  },
  hooks: {
    before: async (ctx: { path?: string; body?: Record<string, unknown> }) => {
      if (ctx.path !== "/sign-up/email") {
        return;
      }

      const body = ctx.body ?? {};
      const source =
        typeof body.acquisitionSource === "string"
          ? body.acquisitionSource
          : "";
      const token =
        typeof body.acquisitionToken === "string" ? body.acquisitionToken : "";
      const intendedRole =
        typeof body.intendedRole === "string" ? body.intendedRole : "STUDENT";

      if (token !== getAcquisitionSecret()) {
        throw APIError.from("FORBIDDEN", {
          code: "PUBLIC_REGISTRATION_DISABLED",
          message:
            "Public registration is disabled. Use an authorized invitation or approved employer activation.",
        });
      }

      if (!isAllowedAcquisitionSourceForRole(source, intendedRole)) {
        throw APIError.from("FORBIDDEN", {
          code: "INVALID_ACQUISITION_SOURCE",
          message: "Invalid account acquisition source.",
        });
      }
    },
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
        resetUrl: resetUrl.toString(),
      });
    },
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
        verificationUrl: verificationUrl.toString(),
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const intendedRole =
            typeof user.intendedRole === "string"
              ? user.intendedRole
              : "STUDENT";

          return {
            data: {
              ...user,
              role: intendedRole,
              roles: [intendedRole],
              onboardingCompleted: false,
            },
          };
        },
        after: async (user) => {
          await ensureSystemRoles();
          await syncAuthUser({
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            image: user.image,
            intendedRole: user.intendedRole as never,
            role: user.role as never,
            roles: user.roles as never,
            universityId: user.universityId as never,
            collegeId: user.collegeId as never,
            onboardingCompleted: user.onboardingCompleted as never,
          });
        },
      },
      update: {
        after: async (user) => {
          await syncAuthUser({
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            image: user.image,
            intendedRole: user.intendedRole as never,
            role: user.role as never,
            roles: user.roles as never,
            universityId: user.universityId as never,
            collegeId: user.collegeId as never,
            onboardingCompleted: user.onboardingCompleted as never,
          });
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          await syncAuthSession({
            id: session.id,
            token: session.token,
            userId: session.userId,
            expiresAt: session.expiresAt,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
          });
          await noteUserLogin(session.userId);
        },
      },
      delete: {
        after: async (session) => {
          await deleteAuthSession(session.id);
        },
      },
    },
  },
});
