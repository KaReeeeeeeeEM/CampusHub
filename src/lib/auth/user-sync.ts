import { ROLE_PERMISSIONS } from "@/features/authorization/permissions";
import {
  ROLE_LABELS,
  ROLES,
  isLegacyStudentLeadershipRoleKey,
  isStudentLeadershipPosition,
  type RoleKey,
  type StudentLeadershipPosition,
} from "@/features/authorization/roles";
import { calculateProfileCompletionPercentage } from "@/features/auth/lib/profile-completion";
import { connectMongo } from "@/lib/db/mongodb";
import { RoleModel, SessionModel, UserModel } from "@/lib/db/models";

type AuthUserRecord = {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  otherNames?: string | null;
  nickname?: string | null;
  avatar?: string | null;
  phoneNumber?: string | null;
  intendedRole?: string | null;
  role?: string | null;
  roles?: string[] | null;
  permissions?: string[] | null;
  studentLeadershipPositions?: StudentLeadershipPosition[] | null;
  universityId?: string | null;
  collegeId?: string | null;
  departmentId?: string | null;
  onboardingCompleted?: boolean | null;
};

type AuthSessionRecord = {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
};

function normalizeRole(value?: string | null): RoleKey {
  return value && value in ROLES ? (value as RoleKey) : "STUDENT";
}

function normalizeRoles(user: AuthUserRecord) {
  const primaryRole = normalizeRole(user.role ?? user.intendedRole);
  const roles = user.roles?.filter((role): role is RoleKey => role in ROLES);

  const resolvedRoles = roles?.length
    ? Array.from(new Set(roles))
    : [primaryRole];

  if (
    resolvedRoles.includes("EMPLOYER") &&
    resolvedRoles.some((role) => role !== "EMPLOYER")
  ) {
    throw new Error("Employer accounts cannot hold any other CampusHub role.");
  }

  return resolvedRoles;
}

function normalizeStudentLeadershipPositions(user: AuthUserRecord) {
  const explicitPositions =
    user.studentLeadershipPositions?.filter(isStudentLeadershipPosition) ?? [];
  const legacyPositions = [user.role, user.intendedRole, ...(user.roles ?? [])]
    .filter(isLegacyStudentLeadershipRoleKey)
    .filter(isStudentLeadershipPosition);

  return Array.from(new Set([...explicitPositions, ...legacyPositions]));
}

function splitDisplayName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] ?? "CampusHub",
    lastName: parts.slice(1).join(" ") || "User",
  };
}

function normalizeUsername(user: AuthUserRecord) {
  const explicit = user.username?.trim().toLowerCase();

  if (explicit) {
    return explicit;
  }

  const emailLocalPart = user.email.split("@")[0] || "user";
  const normalizedLocalPart = emailLocalPart
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");

  return `${normalizedLocalPart || "user"}-${user.id.slice(0, 8)}`;
}

function resolvePrimaryPosition(positions: StudentLeadershipPosition[]) {
  return positions[0] ?? "NONE";
}

export async function ensureSystemRoles() {
  await connectMongo();

  await Promise.all(
    Object.values(ROLES).map((role) =>
      RoleModel.updateOne(
        { key: role },
        {
          $setOnInsert: {
            _id: role,
            key: role,
            name: ROLE_LABELS[role],
            description: `${ROLE_LABELS[role]} access profile`,
            permissions: ROLE_PERMISSIONS[role],
            system: true,
          },
        },
        { upsert: true },
      ),
    ),
  );
}

export async function syncAuthUser(user: AuthUserRecord) {
  await connectMongo();

  const existingUser = await UserModel.findById(user.id)
    .select({
      collegeId: 1,
      departmentId: 1,
      permissions: 1,
      position: 1,
      roles: 1,
      status: 1,
      universityId: 1,
    })
    .lean();
  const roles = normalizeRoles(user);
  const role = roles[0] ?? "STUDENT";
  const studentLeadershipPositions = normalizeStudentLeadershipPositions(user);
  const nameParts = splitDisplayName(user.name);
  const firstName = user.firstName?.trim() || nameParts.firstName;
  const lastName = user.lastName?.trim() || nameParts.lastName;
  const avatar = user.avatar ?? user.image ?? null;
  const isVerified = Boolean(user.emailVerified);
  const position = resolvePrimaryPosition(studentLeadershipPositions);
  const profileCompletionPercentage = calculateProfileCompletionPercentage({
    email: user.email,
    username: normalizeUsername(user),
    firstName,
    lastName,
    avatar,
    phoneNumber: user.phoneNumber ?? null,
    role,
    position,
    isVerified,
  });
  const preservedStatus =
    existingUser?.status === "SUSPENDED" || existingUser?.status === "INACTIVE";
  const status = preservedStatus
    ? existingUser.status
    : isVerified
      ? "ACTIVE"
      : "PENDING";
  const beforeAssignment = existingUser
    ? {
        universityId: existingUser.universityId ?? null,
        collegeId: existingUser.collegeId ?? null,
        departmentId: existingUser.departmentId ?? null,
      }
    : null;
  const afterAssignment = {
    universityId: user.universityId ?? null,
    collegeId: user.collegeId ?? null,
    departmentId: user.departmentId ?? null,
  };
  const beforeRoles = Array.isArray(existingUser?.roles)
    ? existingUser.roles.map(String).sort()
    : [];
  const afterRoles = [...roles].sort();
  const beforePermissions = Array.isArray(existingUser?.permissions)
    ? existingUser.permissions.map(String).sort()
    : [];
  const afterPermissions = user.permissions
    ? Array.from(new Set(user.permissions.map(String))).sort()
    : beforePermissions;
  const beforePosition = existingUser?.position ?? "NONE";

  await UserModel.updateOne(
    { _id: user.id },
    {
      $set: {
        name: user.name,
        email: user.email,
        emailVerified: Boolean(user.emailVerified),
        isVerified,
        image: user.image ?? null,
        username: normalizeUsername(user),
        firstName,
        lastName,
        otherNames: user.otherNames ?? null,
        nickname: user.nickname ?? null,
        avatar,
        phone: user.phoneNumber ?? null,
        phoneNumber: user.phoneNumber ?? null,
        intendedRole: normalizeRole(user.intendedRole),
        role,
        roles,
        permissions: afterPermissions,
        studentLeadershipPositions,
        position,
        universityId: user.universityId ?? null,
        collegeId: user.collegeId ?? null,
        departmentId: user.departmentId ?? null,
        onboardingCompleted: Boolean(user.onboardingCompleted),
        profileCompletionPercentage,
        status,
      },
      $setOnInsert: {
        _id: user.id,
      },
    },
    { upsert: true },
  );

  const hasNewAssignment = Boolean(
    afterAssignment.universityId ||
    afterAssignment.collegeId ||
    afterAssignment.departmentId,
  );
  const assignmentChanged = beforeAssignment
    ? beforeAssignment.universityId !== afterAssignment.universityId ||
      beforeAssignment.collegeId !== afterAssignment.collegeId ||
      beforeAssignment.departmentId !== afterAssignment.departmentId
    : hasNewAssignment;

  if (assignmentChanged) {
    const { writeAuthAuditLog } = await import("@/lib/audit/audit-log-service");

    await writeAuthAuditLog({
      actorId: user.id,
      universityId: afterAssignment.universityId,
      action: "ASSIGNMENT_CHANGE",
      entityType: "user",
      entityId: user.id,
      before: beforeAssignment,
      after: afterAssignment,
      metadata: {
        source: "auth-user-sync",
      },
    });
  }

  if (beforeRoles.join("|") !== afterRoles.join("|")) {
    const { writeAuthAuditLog } = await import("@/lib/audit/audit-log-service");

    await writeAuthAuditLog({
      actorId: user.id,
      universityId: afterAssignment.universityId,
      action: "ROLE_CHANGE",
      entityType: "user",
      entityId: user.id,
      before: { roles: beforeRoles },
      after: { roles: afterRoles },
      metadata: {
        source: "auth-user-sync",
      },
    });
  }

  if (beforePosition !== position) {
    const { writeAuthAuditLog } = await import("@/lib/audit/audit-log-service");

    await writeAuthAuditLog({
      actorId: user.id,
      universityId: afterAssignment.universityId,
      action: "POSITION_CHANGE",
      entityType: "user",
      entityId: user.id,
      before: { position: beforePosition },
      after: { position },
      metadata: {
        source: "auth-user-sync",
      },
    });
  }

  if (beforePermissions.join("|") !== afterPermissions.join("|")) {
    const { writeAuthAuditLog } = await import("@/lib/audit/audit-log-service");

    await writeAuthAuditLog({
      actorId: user.id,
      universityId: afterAssignment.universityId,
      action: "PERMISSION_CHANGE",
      entityType: "user",
      entityId: user.id,
      before: { permissions: beforePermissions },
      after: { permissions: afterPermissions },
      metadata: {
        source: "auth-user-sync",
      },
    });
  }
}

export async function noteUserLogin(userId: string) {
  await connectMongo();

  await UserModel.updateOne(
    { _id: userId },
    {
      $set: {
        lastLoginAt: new Date(),
      },
    },
  );
}

export async function syncAuthSession(session: AuthSessionRecord) {
  await connectMongo();

  await SessionModel.updateOne(
    { _id: session.id },
    {
      $set: {
        token: session.token,
        userId: session.userId,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress ?? null,
        userAgent: session.userAgent ?? null,
      },
      $setOnInsert: {
        _id: session.id,
      },
    },
    { upsert: true },
  );
}

export async function deleteAuthSession(sessionId: string) {
  await connectMongo();
  await SessionModel.deleteOne({ _id: sessionId });
}
