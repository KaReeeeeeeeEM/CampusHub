import { randomUUID } from "node:crypto";

import { hashPassword } from "better-auth/crypto";

import { ROLE_PERMISSIONS } from "@/features/authorization/permissions";
import { calculateProfileCompletionPercentage } from "@/features/auth/lib/profile-completion";
import {
  superAdminBootstrapSchema,
  type SuperAdminBootstrapInput,
} from "@/features/bootstrap/lib/schemas";
import { ensureSystemRoles } from "@/lib/auth/user-sync";
import { connectPostgres, queryPostgres } from "@/lib/db/postgres";
import { AccountModel, RoleModel, UserModel } from "@/lib/db/models";
import { createPgModel } from "@/lib/db/pg-document-model";

const SUPER_ADMIN_ROLE = "SUPER_ADMIN";
const BOOTSTRAP_LOCK_ID = "super-admin-bootstrap";
const BootstrapLockModel = createPgModel("BootstrapLock", "bootstrap_locks");

type BootstrapLock = {
  _id: typeof BOOTSTRAP_LOCK_ID;
  status: "IN_PROGRESS" | "COMPLETED";
  startedAt: Date;
  completedAt?: Date;
  createdUserId?: string;
};

export class BootstrapDisabledError extends Error {
  constructor(message = "Super Admin bootstrap is no longer available.") {
    super(message);
    this.name = "BootstrapDisabledError";
  }
}

export class BootstrapValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BootstrapValidationError";
  }
}

function normalizeUsername(email: string) {
  return (
    email
      .split("@")[0]
      ?.toLowerCase()
      .replace(/[^a-z0-9_.-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "") || "super-admin"
  );
}

async function resolveUniqueUsername(email: string) {
  const base = normalizeUsername(email);
  const existingUser = await UserModel.exists({ username: base });

  if (!existingUser) {
    return base;
  }

  return `${base}-${randomUUID().slice(0, 8)}`;
}

export async function hasSuperAdmin() {
  await connectPostgres();

  const superAdmin = await UserModel.exists({
    $or: [{ role: SUPER_ADMIN_ROLE }, { roles: SUPER_ADMIN_ROLE }],
  });

  return Boolean(superAdmin);
}

export async function isSuperAdminBootstrapEnabled() {
  const hasExistingSuperAdmin = await hasSuperAdmin();

  if (hasExistingSuperAdmin) {
    return false;
  }

  const completedLock = await BootstrapLockModel.findOne({
    _id: BOOTSTRAP_LOCK_ID,
    status: "COMPLETED",
  });

  return !completedLock;
}

async function acquireBootstrapLock() {
  const existingLock = await BootstrapLockModel.findOne({
    _id: BOOTSTRAP_LOCK_ID,
  });

  if (existingLock) {
    throw new BootstrapDisabledError(
      "Super Admin bootstrap is already in progress or has completed.",
    );
  }

  await BootstrapLockModel.create({
    _id: BOOTSTRAP_LOCK_ID,
    status: "IN_PROGRESS",
    startedAt: new Date(),
  } satisfies BootstrapLock);
}

async function releaseBootstrapLock() {
  await BootstrapLockModel.deleteOne({
    _id: BOOTSTRAP_LOCK_ID,
    status: "IN_PROGRESS",
  });
}

async function completeBootstrapLock(userId?: string) {
  const updates: Partial<BootstrapLock> = {
    status: "COMPLETED",
    completedAt: new Date(),
  };

  if (userId) {
    updates.createdUserId = userId;
  }

  await BootstrapLockModel.updateOne(
    { _id: BOOTSTRAP_LOCK_ID },
    {
      $set: updates,
    },
  );
}

export async function createInitialSuperAdmin(
  input: SuperAdminBootstrapInput,
) {
  const values = superAdminBootstrapSchema.parse(input);
  await connectPostgres();

  if (await hasSuperAdmin()) {
    throw new BootstrapDisabledError();
  }

  await acquireBootstrapLock();

  let createdUserId: string | null = null;

  try {
    if (await hasSuperAdmin()) {
      throw new BootstrapDisabledError();
    }

    const existingEmail = await UserModel.exists({ email: values.email });

    if (existingEmail) {
      throw new BootstrapValidationError(
        "An account with this email already exists.",
      );
    }

    await ensureSystemRoles();

    await RoleModel.updateOne(
      { key: SUPER_ADMIN_ROLE },
      {
        $set: {
          permissions: ROLE_PERMISSIONS.SUPER_ADMIN,
          updatedAt: new Date(),
        },
      },
    );

    const now = new Date();
    const userId = randomUUID();
    const username = await resolveUniqueUsername(values.email);
    const displayName = `${values.firstName} ${values.lastName}`;
    const passwordHash = await hashPassword(values.password);
    const profileCompletionPercentage = calculateProfileCompletionPercentage({
      email: values.email,
      username,
      firstName: values.firstName,
      lastName: values.lastName,
      role: SUPER_ADMIN_ROLE,
      position: "NONE",
      isVerified: true,
    });

    await UserModel.create({
      _id: userId,
      name: displayName,
      email: values.email,
      emailVerified: true,
      isVerified: true,
      image: null,
      username,
      firstName: values.firstName,
      lastName: values.lastName,
      otherNames: null,
      nickname: null,
      avatar: null,
      phone: null,
      phoneNumber: null,
      intendedRole: SUPER_ADMIN_ROLE,
      role: SUPER_ADMIN_ROLE,
      roles: [SUPER_ADMIN_ROLE],
      permissions: ROLE_PERMISSIONS.SUPER_ADMIN,
      studentLeadershipPositions: [],
      position: "NONE",
      status: "ACTIVE",
      userType: "ADMIN",
      universityId: null,
      collegeId: null,
      departmentId: null,
      onboardingCompleted: true,
      profileCompletionPercentage,
      createdAt: now,
      updatedAt: now,
    });
    createdUserId = userId;

    await AccountModel.create({
      _id: randomUUID(),
      userId,
      accountId: userId,
      providerId: "credential",
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    await upsertAuthCredentialUser({
      userId,
      displayName,
      email: values.email,
      username,
      firstName: values.firstName,
      lastName: values.lastName,
      passwordHash,
      profileCompletionPercentage,
      now,
    });

    await completeBootstrapLock(userId);

    return {
      id: userId,
      email: values.email,
    };
  } catch (error) {
    if (error instanceof BootstrapDisabledError) {
      await completeBootstrapLock();
    } else {
      if (createdUserId) {
        await Promise.all([
          UserModel.deleteOne({ _id: createdUserId }),
          AccountModel.deleteMany({ userId: createdUserId }),
        ]);
      }

      await releaseBootstrapLock();
    }

    throw error;
  }
}

async function upsertAuthCredentialUser(input: {
  userId: string;
  displayName: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  profileCompletionPercentage: number;
  now: Date;
}) {
  await queryPostgres(
    `
      INSERT INTO "user" (
        "id", "name", "email", "emailVerified", "createdAt", "updatedAt",
        "intendedRole", "role", "username", "firstName", "lastName",
        "position", "status", "isVerified", "profileCompletionPercentage",
        "roles", "permissions", "studentLeadershipPositions",
        "onboardingCompleted", "twoFactorEnabled"
      )
      VALUES (
        $1, $2, $3, TRUE, $4, $4,
        $5, $5, $6, $7, $8,
        'NONE', 'ACTIVE', TRUE, $9,
        $10::jsonb, $11::jsonb, '[]'::jsonb,
        TRUE, FALSE
      )
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "email" = EXCLUDED."email",
        "emailVerified" = TRUE,
        "updatedAt" = EXCLUDED."updatedAt",
        "role" = EXCLUDED."role",
        "username" = EXCLUDED."username",
        "firstName" = EXCLUDED."firstName",
        "lastName" = EXCLUDED."lastName",
        "status" = 'ACTIVE',
        "isVerified" = TRUE,
        "profileCompletionPercentage" = EXCLUDED."profileCompletionPercentage",
        "roles" = EXCLUDED."roles",
        "permissions" = EXCLUDED."permissions",
        "onboardingCompleted" = TRUE
    `,
    [
      input.userId,
      input.displayName,
      input.email,
      input.now,
      SUPER_ADMIN_ROLE,
      input.username,
      input.firstName,
      input.lastName,
      input.profileCompletionPercentage,
      JSON.stringify([SUPER_ADMIN_ROLE]),
      JSON.stringify(ROLE_PERMISSIONS.SUPER_ADMIN),
    ],
  );

  await queryPostgres(
    `
      INSERT INTO "account" (
        "id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt"
      )
      VALUES ($1, $2, 'credential', $2, $3, $4, $4)
      ON CONFLICT ("id") DO UPDATE SET
        "password" = EXCLUDED."password",
        "updatedAt" = EXCLUDED."updatedAt"
    `,
    [`bootstrap-account-${input.userId}`, input.userId, input.passwordHash, input.now],
  );
}
