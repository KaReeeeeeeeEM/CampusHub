import { headers } from "next/headers";

import type { RoleKey } from "@/features/authorization/roles";
import { isStudentLeadershipPosition } from "@/features/authorization/roles";
import { hasRole } from "@/features/authorization/rbac";
import { auth } from "@/lib/auth/auth";
import { writeAuthAuditLog } from "@/lib/audit/audit-log-service";
import { connectMongo } from "@/lib/db/mongodb";
import { UserModel } from "@/lib/db/models";
import { forbidden, unauthorized } from "@/lib/api/response";
import type { AuthSession, AuthUser } from "@/types/auth";

function serializeAuthUser(user: Record<string, unknown>): AuthUser {
  return {
    id: String(user._id ?? user.id),
    name: typeof user.name === "string" ? user.name : null,
    email: String(user.email),
    username: typeof user.username === "string" ? user.username : null,
    firstName: typeof user.firstName === "string" ? user.firstName : null,
    lastName: typeof user.lastName === "string" ? user.lastName : null,
    otherNames: typeof user.otherNames === "string" ? user.otherNames : null,
    nickname: typeof user.nickname === "string" ? user.nickname : null,
    image: typeof user.image === "string" ? user.image : null,
    avatar: typeof user.avatar === "string" ? user.avatar : null,
    phoneNumber: typeof user.phoneNumber === "string" ? user.phoneNumber : null,
    role: user.role as RoleKey,
    roles: Array.isArray(user.roles) ? user.roles.map(String) : [],
    permissions: Array.isArray(user.permissions)
      ? user.permissions.map(String)
      : [],
    position: typeof user.position === "string" ? user.position : "NONE",
    studentLeadershipPositions: Array.isArray(user.studentLeadershipPositions)
      ? user.studentLeadershipPositions
          .map(String)
          .filter(isStudentLeadershipPosition)
      : [],
    status: typeof user.status === "string" ? user.status : "PENDING",
    isVerified: Boolean(user.isVerified ?? user.emailVerified),
    profileCompletionPercentage:
      typeof user.profileCompletionPercentage === "number"
        ? user.profileCompletionPercentage
        : 0,
    universityId:
      typeof user.universityId === "string" ? user.universityId : null,
    collegeId: typeof user.collegeId === "string" ? user.collegeId : null,
    departmentId:
      typeof user.departmentId === "string" ? user.departmentId : null,
    onboardingCompleted: Boolean(user.onboardingCompleted),
  };
}

export async function getCurrentUser() {
  const session = (await auth.api.getSession({
    headers: await headers(),
    query: {
      disableCookieCache: true,
    },
  })) as AuthSession | null;

  if (!session) {
    return null;
  }

  await connectMongo();

  const user = await UserModel.findById(session.user.id).lean();

  if (!user) {
    return null;
  }

  return serializeAuthUser(user);
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    await writeAuthAuditLog({
      actorId: null,
      action: "UNAUTHORIZED_ACCESS",
      entityType: "authorization",
      entityId: null,
      metadata: {
        reason: "NO_AUTHENTICATED_USER",
      },
    });
    throw unauthorized();
  }

  if (user.status === "SUSPENDED" || user.status === "INACTIVE") {
    await writeAuthAuditLog({
      actorId: user.id,
      universityId: user.universityId ?? null,
      action: "UNAUTHORIZED_ACCESS",
      entityType: "authorization",
      entityId: user.id,
      metadata: {
        reason: "ACCOUNT_NOT_ACTIVE",
        status: user.status,
      },
    });
    throw forbidden("Your account is not active.");
  }

  return user;
}

export async function requireRole(allowedRoles: RoleKey[]) {
  const user = await requireAuth();

  if (!hasRole(user.role, allowedRoles, user.roles)) {
    await writeAuthAuditLog({
      actorId: user.id,
      universityId: user.universityId ?? null,
      action: "PERMISSION_DENIED",
      entityType: "authorization",
      entityId: user.id,
      metadata: {
        reason: "ROLE_NOT_ALLOWED",
        allowedRoles,
      },
    });
    throw forbidden();
  }

  return user;
}
