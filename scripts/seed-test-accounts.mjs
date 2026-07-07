/* global console, process */
import { readFile } from "node:fs/promises";
import { MongoClient } from "mongodb";
import { hashPassword, verifyPassword } from "better-auth/crypto";

const PASSWORD = "CampusHub@2026";

const TEST_ACCOUNTS = [
  {
    key: "SUPER_ADMIN",
    label: "Super Admin",
    email: "seed.superadmin@campushub.test",
  },
  {
    key: "CAMPUS_ADMIN",
    label: "Campus Admin",
    email: "seed.campus.admin@udsm.ac.tz",
  },
  {
    key: "REPRESENTATIVE",
    label: "Student Representative",
    email: "seed.representative@udsm.ac.tz",
  },
  {
    key: "TEACHER",
    label: "Teacher",
    email: "seed.teacher@udsm.ac.tz",
  },
  {
    key: "STUDENT",
    label: "Student",
    email: "seed.student@udsm.ac.tz",
  },
  {
    key: "ALUMNI",
    label: "Alumni",
    email: "seed.alumni@udsm.ac.tz",
  },
  {
    key: "EMPLOYER",
    label: "Employer",
    email: "seed.employer@safaritech.co.tz",
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

  const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/campushub";
  const dbName = process.env.MONGODB_DB_NAME ?? "campushub";
  const client = new MongoClient(uri);
  await client.connect();

  const db = client.db(dbName);
  const now = new Date();
  const passwordHash = await hashPassword(PASSWORD);
  const summary = [];

  for (const account of TEST_ACCOUNTS) {
    const user = await db.collection("user").findOne({ email: account.email });

    if (!user?._id) {
      throw new Error(
        `Missing seed user for ${account.label} (${account.email}). Run npm run seed:platform first.`,
      );
    }

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

    await db.collection("account").updateOne(
      { providerId: "credential", accountId: user._id },
      {
        $set: {
          userId: user._id,
          accountId: user._id,
          providerId: "credential",
          password: passwordHash,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: `seed-account-${user._id}`,
          createdAt: now,
        },
      },
      { upsert: true },
    );

    const credential = await db.collection("account").findOne({
      providerId: "credential",
      accountId: user._id,
    });
    const passwordWorks = Boolean(
      credential?.password &&
        (await verifyPassword({
          hash: credential.password,
          password: PASSWORD,
        })),
    );

    summary.push({
      role: account.key,
      email: account.email,
      password: passwordWorks ? "verified" : "failed",
    });
  }

  await client.close();

  console.table(summary);
  console.log(`Shared password: ${PASSWORD}`);
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
