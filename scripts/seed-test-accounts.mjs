/* global console, process */
import { readFile } from "node:fs/promises";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { createPgSeedDb } from "./pg-document-db.mjs";

function getPassword() {
  return process.env.CAMPUSHUB_TEST_ACCOUNT_PASSWORD ?? "CampusHub@2026";
}

const TEST_ACCOUNTS = [
  {
    key: "SUPER_ADMIN",
    label: "Super Admin",
    email: "seed.superadmin@campushub.test",
    firstName: "Aisha",
    lastName: "Mwanjale",
    title: "Platform Operations Lead",
  },
  {
    key: "CAMPUS_ADMIN",
    label: "Campus Admin",
    email: "seed.campus.admin@udsm.ac.tz",
    firstName: "Johnson",
    lastName: "Mmbaga",
    title: "Campus Operations Lead",
  },
  {
    key: "REPRESENTATIVE",
    label: "Student Representative",
    email: "seed.representative@udsm.ac.tz",
    firstName: "Neema",
    lastName: "Komba",
    title: "Student Representative",
  },
  {
    key: "TEACHER",
    label: "Teacher",
    email: "seed.teacher@udsm.ac.tz",
    firstName: "Rehema",
    lastName: "Mushi",
    title: "Lecturer",
  },
  {
    key: "STUDENT",
    label: "Student",
    email: "seed.student@udsm.ac.tz",
    firstName: "Brian",
    lastName: "Massawe",
    title: "Student",
  },
  {
    key: "ALUMNI",
    label: "Alumni",
    email: "seed.alumni@udsm.ac.tz",
    firstName: "Lilian",
    lastName: "Mrope",
    title: "Alumni Mentor",
  },
  {
    key: "EMPLOYER",
    label: "Employer",
    email: "seed.employer@safaritech.co.tz",
    firstName: "Daniel",
    lastName: "Mwakyusa",
    title: "Employer Partner",
  },
];

async function loadEnv() {
  try {
    const env = await readFile(".env", "utf8");
    for (const line of env.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...parts] = trimmed.split("=");
      if (process.env[key]) continue;
      process.env[key] = parts.join("=").replace(/^["']|["']$/g, "");
    }
  } catch {
    // Environment variables may be supplied by the caller.
  }
}

async function main() {
  await loadEnv();

  const db = await createPgSeedDb();
  const now = new Date();
  const password = getPassword();
  const passwordHash = await hashPassword(password);
  const summary = [];

  for (const account of TEST_ACCOUNTS) {
    const user =
      (await db.collection("user").findOne({ email: account.email })) ??
      (await createSeedUser(db, account, now));

    await db.collection("user").updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerified: true,
          isVerified: true,
          status: "ACTIVE",
          onboardingCompleted: true,
          updatedAt: now,
        },
      },
    );

    await upsertAuthUser(db.pool, {
      ...user,
      emailVerified: true,
      isVerified: true,
      status: "ACTIVE",
      onboardingCompleted: true,
      updatedAt: now,
    });
    await upsertCredentialAccount(db.pool, user._id, passwordHash, now);

    const credential = await findCredentialAccount(db.pool, user._id);
    const passwordWorks = Boolean(
      credential?.password &&
        (await verifyPassword({
          hash: credential.password,
          password,
        })),
    );

    summary.push({
      role: account.key,
      email: account.email,
      password: passwordWorks ? "verified" : "failed",
    });
  }

  await db.close();

  console.table(summary);
  console.log(`Shared password: ${password}`);
}

async function createSeedUser(db, account, now) {
  const user = buildSeedUser(account, now);
  await db.collection("user").insertOne(user);
  return user;
}

function buildSeedUser(account, now) {
  const role = account.key === "REPRESENTATIVE" ? "STUDENT" : account.key;
  const leadership =
    account.key === "REPRESENTATIVE" ? ["REPRESENTATIVE"] : [];
  const id = `seed-user-${account.key.toLowerCase().replace(/_/g, "-")}`;
  const universityId = account.key === "SUPER_ADMIN" ? null : "seed-uni-udsm";
  const collegeId =
    ["SUPER_ADMIN", "EMPLOYER", "ALUMNI"].includes(account.key)
      ? null
      : "seed-college-coict";
  const departmentId =
    ["SUPER_ADMIN", "EMPLOYER", "ALUMNI"].includes(account.key)
      ? null
      : "seed-dept-cse";

  return {
    _id: id,
    id,
    name: `${account.firstName} ${account.lastName}`,
    email: account.email,
    emailVerified: true,
    isVerified: true,
    username: account.email.split("@")[0].replace(/\./g, "-"),
    firstName: account.firstName,
    lastName: account.lastName,
    title: account.title,
    image: "",
    avatar: null,
    phone: "+255700000000",
    phoneNumber: "+255700000000",
    intendedRole: account.key,
    role,
    roles: [role],
    permissions: [],
    studentLeadershipPositions: leadership,
    position: "NONE",
    status: "ACTIVE",
    userType: role === "EMPLOYER" ? "EMPLOYER" : role === "ALUMNI" ? "ALUMNI" : "STUDENT",
    universityId,
    collegeId,
    departmentId,
    onboardingCompleted: true,
    twoFactorEnabled: false,
    profileCompletionPercentage: 100,
    createdAt: now,
    updatedAt: now,
  };
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});

async function upsertAuthUser(pool, user) {
  await pool.query(
    `
      INSERT INTO "user" (
        "id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt",
        "intendedRole", "role", "username", "firstName", "lastName", "otherNames",
        "nickname", "avatar", "phoneNumber", "position", "status", "isVerified",
        "profileCompletionPercentage", "roles", "permissions",
        "studentLeadershipPositions", "universityId", "collegeId", "departmentId",
        "onboardingCompleted", "twoFactorEnabled"
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19,
        $20, $21::jsonb, $22::jsonb,
        $23::jsonb, $24, $25, $26,
        $27, $28
      )
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "email" = EXCLUDED."email",
        "emailVerified" = EXCLUDED."emailVerified",
        "image" = EXCLUDED."image",
        "updatedAt" = EXCLUDED."updatedAt",
        "intendedRole" = EXCLUDED."intendedRole",
        "role" = EXCLUDED."role",
        "username" = EXCLUDED."username",
        "firstName" = EXCLUDED."firstName",
        "lastName" = EXCLUDED."lastName",
        "otherNames" = EXCLUDED."otherNames",
        "nickname" = EXCLUDED."nickname",
        "avatar" = EXCLUDED."avatar",
        "phoneNumber" = EXCLUDED."phoneNumber",
        "position" = EXCLUDED."position",
        "status" = EXCLUDED."status",
        "isVerified" = EXCLUDED."isVerified",
        "profileCompletionPercentage" = EXCLUDED."profileCompletionPercentage",
        "roles" = EXCLUDED."roles",
        "permissions" = EXCLUDED."permissions",
        "studentLeadershipPositions" = EXCLUDED."studentLeadershipPositions",
        "universityId" = EXCLUDED."universityId",
        "collegeId" = EXCLUDED."collegeId",
        "departmentId" = EXCLUDED."departmentId",
        "onboardingCompleted" = EXCLUDED."onboardingCompleted",
        "twoFactorEnabled" = EXCLUDED."twoFactorEnabled"
    `,
    [
      user._id,
      user.name,
      user.email,
      Boolean(user.emailVerified),
      user.image ?? user.avatar ?? null,
      user.createdAt ?? new Date(),
      user.updatedAt ?? new Date(),
      user.intendedRole ?? user.role ?? "STUDENT",
      user.role ?? "STUDENT",
      user.username ?? null,
      user.firstName ?? null,
      user.lastName ?? null,
      user.otherNames ?? null,
      user.nickname ?? null,
      user.avatar ?? null,
      user.phoneNumber ?? user.phone ?? null,
      user.position ?? "NONE",
      user.status ?? "ACTIVE",
      Boolean(user.isVerified),
      user.profileCompletionPercentage ?? 100,
      JSON.stringify(user.roles ?? [user.role ?? "STUDENT"]),
      JSON.stringify(user.permissions ?? []),
      JSON.stringify(user.studentLeadershipPositions ?? []),
      user.universityId ?? null,
      user.collegeId ?? null,
      user.departmentId ?? null,
      Boolean(user.onboardingCompleted),
      Boolean(user.twoFactorEnabled),
    ],
  );
}

async function upsertCredentialAccount(pool, userId, passwordHash, now) {
  await pool.query(
    `
      INSERT INTO "account" (
        "id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt"
      )
      VALUES ($1, $2, 'credential', $2, $3, $4, $4)
      ON CONFLICT ("id") DO UPDATE SET
        "accountId" = EXCLUDED."accountId",
        "providerId" = EXCLUDED."providerId",
        "userId" = EXCLUDED."userId",
        "password" = EXCLUDED."password",
        "updatedAt" = EXCLUDED."updatedAt"
    `,
    [`seed-account-${userId}`, userId, passwordHash, now],
  );
}

async function findCredentialAccount(pool, userId) {
  const result = await pool.query(
    `SELECT "password" FROM "account" WHERE "providerId" = 'credential' AND "accountId" = $1 LIMIT 1`,
    [userId],
  );

  return result.rows[0] ?? null;
}
