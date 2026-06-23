import { APIError, betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { twoFactor } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";

import {
  userProfileUpdateSchema,
  userRoleSchema,
} from "@/features/auth/lib/schemas";
import {
  deleteAuthSession,
  ensureSystemRoles,
  noteUserLogin,
  syncAuthSession,
  syncAuthUser,
} from "@/lib/auth/user-sync";
import { writeAuthAuditLog } from "@/lib/audit/audit-log-service";
import { getMongoNativeClient, getMongoNativeDb } from "@/lib/db/mongodb";

type AuthHookContext = {
  path?: string;
  headers?: Headers;
  request?: Request;
};

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
  const sourceRoleMap: Record<string, string[]> = {
    STUDENT_INVITATION: ["STUDENT"],
    TEACHER_INVITATION: ["TEACHER"],
    TEACHER_CREATION: ["TEACHER"],
    REPRESENTATIVE_INVITATION: ["STUDENT", "REPRESENTATIVE"],
    CAMPUS_ADMIN_INVITATION: ["CAMPUS_ADMIN"],
    EMPLOYER_ACTIVATION: ["EMPLOYER"],
  };

  return sourceRoleMap[source]?.includes(role) ?? false;
}

function assertValidSignUpPayload(body: Record<string, unknown>) {
  const intendedRole =
    typeof body.intendedRole === "string" ? body.intendedRole : "STUDENT";

  try {
    userRoleSchema.parse(intendedRole);
    userProfileUpdateSchema.partial().parse({
      username: body.username,
      firstName: body.firstName,
      lastName: body.lastName,
      otherNames: body.otherNames,
      nickname: body.nickname,
      avatar: body.avatar,
      phoneNumber: body.phoneNumber,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      throw APIError.from("BAD_REQUEST", {
        code: "INVALID_SIGN_UP_PAYLOAD",
        message: "Invalid sign-up payload.",
      });
    }

    throw error;
  }
}

function resolveCreatedUserAccess(source: string, intendedRole: string) {
  if (
    source === "REPRESENTATIVE_INVITATION" ||
    intendedRole === "REPRESENTATIVE"
  ) {
    return {
      role: "STUDENT",
      roles: ["STUDENT"],
      studentLeadershipPositions: ["REPRESENTATIVE"],
    };
  }

  if (intendedRole === "COMMITTEE_MEMBER") {
    return {
      role: "STUDENT",
      roles: ["STUDENT"],
      studentLeadershipPositions: ["COMMITTEE_MEMBER"],
    };
  }

  return {
    role: intendedRole,
    roles: [intendedRole],
    studentLeadershipPositions: [],
  };
}

function getAuditRequestMetadata(context?: AuthHookContext | null) {
  const headers = context?.headers ?? context?.request?.headers;

  return {
    ipAddress:
      headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headers?.get("x-real-ip") ??
      null,
    userAgent: headers?.get("user-agent") ?? null,
    requestId: headers?.get("x-request-id") ?? null,
  };
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
      username: {
        type: "string",
        required: false,
        input: true,
        returned: true,
      },
      firstName: {
        type: "string",
        required: false,
        input: true,
        returned: true,
      },
      lastName: {
        type: "string",
        required: false,
        input: true,
        returned: true,
      },
      otherNames: {
        type: "string",
        required: false,
        input: true,
        returned: true,
      },
      nickname: {
        type: "string",
        required: false,
        input: true,
        returned: true,
      },
      avatar: {
        type: "string",
        required: false,
        input: true,
        returned: true,
      },
      phoneNumber: {
        type: "string",
        required: false,
        input: true,
        returned: true,
      },
      position: {
        type: "string",
        required: false,
        input: false,
        returned: true,
        defaultValue: "NONE",
      },
      status: {
        type: "string",
        required: false,
        input: false,
        returned: true,
        defaultValue: "PENDING",
      },
      isVerified: {
        type: "boolean",
        required: false,
        input: false,
        returned: true,
        defaultValue: false,
      },
      profileCompletionPercentage: {
        type: "number",
        required: false,
        input: false,
        returned: true,
        defaultValue: 0,
      },
      roles: {
        type: "string[]",
        required: false,
        input: false,
        returned: true,
        defaultValue: ["STUDENT"],
      },
      permissions: {
        type: "string[]",
        required: false,
        input: false,
        returned: true,
        defaultValue: [],
      },
      studentLeadershipPositions: {
        type: "string[]",
        required: false,
        input: false,
        returned: true,
        defaultValue: [],
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
      departmentId: {
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
      twoFactorEnabled: {
        type: "boolean",
        required: false,
        input: false,
        returned: true,
        defaultValue: false,
      },
    },
  },
  plugins: [
    twoFactor({
      issuer: "CampusHub",
      allowPasswordless: true,
    }),
    passkey({
      rpName: "CampusHub",
      origin: getAuthBaseUrl(),
    }),
  ],
  hooks: {
    before: async (ctx: { path?: string; body?: Record<string, unknown> }) => {
      if (ctx.path !== "/sign-up/email") {
        return;
      }

      const body = ctx.body ?? {};
      assertValidSignUpPayload(body);

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
      enabled: false,
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
          const acquisitionSource =
            typeof user.acquisitionSource === "string"
              ? user.acquisitionSource
              : "";
          const access = resolveCreatedUserAccess(
            acquisitionSource,
            intendedRole,
          );

          return {
            data: {
              ...user,
              ...access,
              status: user.emailVerified ? "ACTIVE" : "PENDING",
              isVerified: Boolean(user.emailVerified),
              onboardingCompleted:
                acquisitionSource === "CAMPUS_ADMIN_INVITATION",
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
            username: user.username as never,
            firstName: user.firstName as never,
            lastName: user.lastName as never,
            otherNames: user.otherNames as never,
            nickname: user.nickname as never,
            avatar: user.avatar as never,
            phoneNumber: user.phoneNumber as never,
            intendedRole: user.intendedRole as never,
            role: user.role as never,
            roles: user.roles as never,
            permissions: user.permissions as never,
            studentLeadershipPositions:
              user.studentLeadershipPositions as never,
            universityId: user.universityId as never,
            collegeId: user.collegeId as never,
            departmentId: user.departmentId as never,
            onboardingCompleted: user.onboardingCompleted as never,
            twoFactorEnabled: user.twoFactorEnabled as never,
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
            username: user.username as never,
            firstName: user.firstName as never,
            lastName: user.lastName as never,
            otherNames: user.otherNames as never,
            nickname: user.nickname as never,
            avatar: user.avatar as never,
            phoneNumber: user.phoneNumber as never,
            intendedRole: user.intendedRole as never,
            role: user.role as never,
            roles: user.roles as never,
            permissions: user.permissions as never,
            studentLeadershipPositions:
              user.studentLeadershipPositions as never,
            universityId: user.universityId as never,
            collegeId: user.collegeId as never,
            departmentId: user.departmentId as never,
            onboardingCompleted: user.onboardingCompleted as never,
            twoFactorEnabled: user.twoFactorEnabled as never,
          });
          await writeAuthAuditLog({
            actorId: user.id,
            universityId: (user.universityId as string | null) ?? null,
            action: "PROFILE_UPDATE",
            entityType: "user",
            entityId: user.id,
            metadata: {
              source: "better-auth.user.update",
            },
          });
        },
      },
    },
    account: {
      update: {
        after: async (account, context) => {
          if (!account?.password) {
            return;
          }

          const metadata = getAuditRequestMetadata(context);

          await writeAuthAuditLog({
            actorId: account.userId,
            action: "PASSWORD_CHANGE",
            entityType: "user",
            entityId: account.userId,
            ...metadata,
            metadata: {
              providerId: account.providerId,
              source: "better-auth.account.update",
            },
          });
        },
      },
    },
    session: {
      create: {
        after: async (session, context) => {
          await syncAuthSession({
            id: session.id,
            token: session.token,
            userId: session.userId,
            expiresAt: session.expiresAt,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
          });
          await noteUserLogin(session.userId);
          await writeAuthAuditLog({
            actorId: session.userId,
            action: "LOGIN",
            entityType: "session",
            entityId: session.id,
            ...getAuditRequestMetadata(context),
          });
        },
      },
      delete: {
        after: async (session, context) => {
          await deleteAuthSession(session.id);
          await writeAuthAuditLog({
            actorId: session.userId,
            action: "LOGOUT",
            entityType: "session",
            entityId: session.id,
            ...getAuditRequestMetadata(context),
          });
        },
      },
    },
  },
});
