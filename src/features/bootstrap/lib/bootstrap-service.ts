import { randomUUID } from "node:crypto";

import { hashPassword } from "better-auth/crypto";
import { MongoServerError } from "mongodb";

import { ROLE_PERMISSIONS } from "@/features/authorization/permissions";
import { calculateProfileCompletionPercentage } from "@/features/auth/lib/profile-completion";
import {
  superAdminBootstrapSchema,
  type SuperAdminBootstrapInput,
} from "@/features/bootstrap/lib/schemas";
import { ensureSystemRoles } from "@/lib/auth/user-sync";
import { connectMongo, getMongoDb } from "@/lib/db/mongodb";
import { AccountModel, RoleModel, UserModel } from "@/lib/db/models";

const SUPER_ADMIN_ROLE = "SUPER_ADMIN";
const BOOTSTRAP_LOCK_ID = "super-admin-bootstrap";

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

function isDuplicateKeyError(error: unknown) {
  return error instanceof MongoServerError && error.code === 11000;
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
  await connectMongo();

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

  const db = await getMongoDb();
  const completedLock = await db
    .collection<BootstrapLock>("bootstrap_locks")
    .findOne({ _id: BOOTSTRAP_LOCK_ID, status: "COMPLETED" });

  return !completedLock;
}

async function acquireBootstrapLock() {
  const db = await getMongoDb();

  try {
    await db.collection<BootstrapLock>("bootstrap_locks").insertOne({
      _id: BOOTSTRAP_LOCK_ID,
      status: "IN_PROGRESS",
      startedAt: new Date(),
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new BootstrapDisabledError(
        "Super Admin bootstrap is already in progress or has completed.",
      );
    }

    throw error;
  }
}

async function releaseBootstrapLock() {
  const db = await getMongoDb();

  await db.collection<BootstrapLock>("bootstrap_locks").deleteOne({
    _id: BOOTSTRAP_LOCK_ID,
    status: "IN_PROGRESS",
  });
}

async function completeBootstrapLock(userId?: string) {
  const db = await getMongoDb();

  const updates: Partial<BootstrapLock> = {
    status: "COMPLETED",
    completedAt: new Date(),
  };

  if (userId) {
    updates.createdUserId = userId;
  }

  await db.collection<BootstrapLock>("bootstrap_locks").updateOne(
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
  await connectMongo();

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
