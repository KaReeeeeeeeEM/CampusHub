/* global console, process */

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { hashPassword } from "better-auth/crypto";
import { MongoClient } from "mongodb";

const seedEmail = "admin@campushub.com";
const seedPassword = "Admin@123456";

const roles = {
  SUPER_ADMIN: {
    label: "Super Admin",
    permissions: [
      "platform:manage",
      "university:manage",
      "user:read",
      "user:manage",
      "tenant:read",
      "tenant:manage",
    ],
  },
  CAMPUS_ADMIN: {
    label: "Campus Admin",
    permissions: [
      "university:manage",
      "user:read",
      "user:manage",
      "tenant:read",
      "tenant:manage",
    ],
  },
  REPRESENTATIVE: {
    label: "Campus Representative",
    permissions: ["user:read", "tenant:read"],
  },
  COMMITTEE_MEMBER: {
    label: "Committee Member",
    permissions: ["user:read", "tenant:read"],
  },
  TEACHER: {
    label: "Teacher",
    permissions: ["user:read", "tenant:read"],
  },
  STUDENT: {
    label: "Student",
    permissions: ["tenant:read"],
  },
  ALUMNI: {
    label: "Alumni",
    permissions: ["tenant:read"],
  },
  EMPLOYER: {
    label: "Employer",
    permissions: ["tenant:read"],
  },
};

function loadEnvFile(file) {
  const path = resolve(process.cwd(), file);

  if (!existsSync(path)) {
    return;
  }

  const lines = readFileSync(path, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const index = trimmed.indexOf("=");

    if (index === -1) {
      continue;
    }

    const key = trimmed.slice(0, index).trim();
    const raw = trimmed.slice(index + 1).trim();
    const value = raw.replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function getMongoUri() {
  return process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/campushub";
}

function getMongoDbName() {
  return process.env.MONGODB_DB_NAME || "campushub";
}

async function ensureRoles(db, now) {
  await Promise.all(
    Object.entries(roles).map(([key, role]) =>
      db.collection("role").updateOne(
        { _id: key },
        {
          $setOnInsert: {
            _id: key,
            key,
            name: role.label,
            description: `${role.label} access profile`,
            permissions: role.permissions,
            system: true,
            createdAt: now,
          },
          $set: {
            updatedAt: now,
          },
        },
        { upsert: true },
      ),
    ),
  );
}

async function main() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");

  const client = new MongoClient(getMongoUri());
  await client.connect();

  try {
    const db = client.db(getMongoDbName());
    const now = new Date();

    await ensureRoles(db, now);

    const existingSuperAdmin = await db.collection("user").findOne({
      roles: "SUPER_ADMIN",
    });

    if (existingSuperAdmin) {
      console.info("SUPER_ADMIN already exists. Seed skipped.", {
        email: existingSuperAdmin.email,
      });
      return;
    }

    const existingAdminByEmail = await db.collection("user").findOne({
      email: seedEmail,
    });
    const userId = existingAdminByEmail?._id || randomUUID();
    const passwordHash = await hashPassword(seedPassword);

    await db.collection("user").updateOne(
      { _id: userId },
      {
        $set: {
          name: "CampusHub Super Admin",
          email: seedEmail,
          emailVerified: true,
          image: null,
          intendedRole: "SUPER_ADMIN",
          role: "SUPER_ADMIN",
          roles: ["SUPER_ADMIN"],
          universityId: null,
          collegeId: null,
          onboardingCompleted: true,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: userId,
          createdAt: now,
        },
      },
      { upsert: true },
    );

    await db.collection("account").updateOne(
      {
        userId,
        providerId: "credential",
      },
      {
        $set: {
          accountId: userId,
          providerId: "credential",
          userId,
          password: passwordHash,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: randomUUID(),
          createdAt: now,
        },
      },
      { upsert: true },
    );

    console.info("CampusHub SUPER_ADMIN seeded successfully.", {
      email: seedEmail,
      password: seedPassword,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login?callbackUrl=%2Fsuper-admin%2Fdashboard`,
    });
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Failed to seed CampusHub SUPER_ADMIN.", error);
  process.exitCode = 1;
});
