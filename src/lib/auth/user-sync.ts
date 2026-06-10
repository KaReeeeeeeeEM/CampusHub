import { ROLE_PERMISSIONS } from "@/features/authorization/permissions";
import {
  ROLE_LABELS,
  ROLES,
  isLegacyStudentLeadershipRoleKey,
  isStudentLeadershipPosition,
  type RoleKey,
  type StudentLeadershipPosition,
} from "@/features/authorization/roles";
import { connectMongo } from "@/lib/db/mongodb";
import { RoleModel, SessionModel, UserModel } from "@/lib/db/models";

type AuthUserRecord = {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string | null;
  intendedRole?: string | null;
  role?: string | null;
  roles?: string[] | null;
  studentLeadershipPositions?: StudentLeadershipPosition[] | null;
  universityId?: string | null;
  collegeId?: string | null;
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
  const legacyPositions = [
    user.role,
    user.intendedRole,
    ...(user.roles ?? []),
  ]
    .filter(isLegacyStudentLeadershipRoleKey)
    .filter(isStudentLeadershipPosition);

  return Array.from(new Set([...explicitPositions, ...legacyPositions]));
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

  const roles = normalizeRoles(user);
  const role = roles[0] ?? "STUDENT";
  const studentLeadershipPositions = normalizeStudentLeadershipPositions(user);

  await UserModel.updateOne(
    { _id: user.id },
    {
      $set: {
        name: user.name,
        email: user.email,
        emailVerified: Boolean(user.emailVerified),
        image: user.image ?? null,
        intendedRole: normalizeRole(user.intendedRole),
        role,
        roles,
        studentLeadershipPositions,
        universityId: user.universityId ?? null,
        collegeId: user.collegeId ?? null,
        onboardingCompleted: Boolean(user.onboardingCompleted),
      },
      $setOnInsert: {
        _id: user.id,
      },
    },
    { upsert: true },
  );
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
