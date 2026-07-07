/* global process */
import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import pg from "pg";

const { Pool } = pg;

function getDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for Neon Postgres.");
  }

  return process.env.DATABASE_URL;
}

export async function createPgSeedDb() {
  const pool = new Pool(getPoolConfig());

  await ensurePgSeedSchema(pool);

  return {
    collection(name) {
      return new PgSeedCollection(pool, name);
    },
    async close() {
      await pool.end();
    },
    pool,
  };
}

function getPoolConfig() {
  const connectionString = getDatabaseUrl();
  const hostaddr = process.env.DATABASE_HOSTADDR;

  if (!hostaddr) {
    return {
      connectionString,
      max: 5,
      ssl: { rejectUnauthorized: false },
    };
  }

  const url = new URL(connectionString);

  return {
    host: hostaddr,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    max: 5,
    ssl: {
      rejectUnauthorized: false,
      servername: url.hostname,
    },
  };
}

export async function ensurePgSeedSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "user" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL UNIQUE,
      "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
      "image" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "acquisitionSource" TEXT,
      "acquisitionToken" TEXT,
      "intendedRole" TEXT DEFAULT 'STUDENT',
      "role" TEXT DEFAULT 'STUDENT',
      "username" TEXT,
      "firstName" TEXT,
      "lastName" TEXT,
      "otherNames" TEXT,
      "nickname" TEXT,
      "avatar" TEXT,
      "phoneNumber" TEXT,
      "position" TEXT DEFAULT 'NONE',
      "status" TEXT DEFAULT 'PENDING',
      "isVerified" BOOLEAN DEFAULT FALSE,
      "profileCompletionPercentage" INTEGER DEFAULT 0,
      "roles" JSONB DEFAULT '["STUDENT"]'::jsonb,
      "permissions" JSONB DEFAULT '[]'::jsonb,
      "studentLeadershipPositions" JSONB DEFAULT '[]'::jsonb,
      "universityId" TEXT,
      "collegeId" TEXT,
      "departmentId" TEXT,
      "onboardingCompleted" BOOLEAN DEFAULT FALSE,
      "twoFactorEnabled" BOOLEAN DEFAULT FALSE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "session" (
      "id" TEXT PRIMARY KEY,
      "expiresAt" TIMESTAMPTZ NOT NULL,
      "token" TEXT NOT NULL UNIQUE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "account" (
      "id" TEXT PRIMARY KEY,
      "accountId" TEXT NOT NULL,
      "providerId" TEXT NOT NULL,
      "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "accessToken" TEXT,
      "refreshToken" TEXT,
      "idToken" TEXT,
      "accessTokenExpiresAt" TIMESTAMPTZ,
      "refreshTokenExpiresAt" TIMESTAMPTZ,
      "scope" TEXT,
      "password" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "verification" (
      "id" TEXT PRIMARY KEY,
      "identifier" TEXT NOT NULL,
      "value" TEXT NOT NULL,
      "expiresAt" TIMESTAMPTZ NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "twoFactor" (
      "id" TEXT PRIMARY KEY,
      "secret" TEXT NOT NULL,
      "backupCodes" TEXT NOT NULL,
      "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "verified" BOOLEAN DEFAULT TRUE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "passkey" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT,
      "publicKey" TEXT NOT NULL,
      "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "credentialID" TEXT NOT NULL,
      "counter" INTEGER NOT NULL,
      "deviceType" TEXT NOT NULL,
      "backedUp" BOOLEAN NOT NULL,
      "transports" TEXT,
      "createdAt" TIMESTAMPTZ,
      "aaguid" TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_documents (
      collection TEXT NOT NULL,
      id TEXT NOT NULL,
      doc JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (collection, id)
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS "user_email_uidx" ON "user" ("email")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "twoFactor_secret_idx" ON "twoFactor" ("secret")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "twoFactor_userId_idx" ON "twoFactor" ("userId")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "passkey_userId_idx" ON "passkey" ("userId")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "passkey_credentialID_idx" ON "passkey" ("credentialID")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_documents_collection_idx ON app_documents (collection)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS app_documents_doc_gin_idx ON app_documents USING GIN (doc jsonb_path_ops)`);
}

class PgSeedCollection {
  constructor(pool, name) {
    this.pool = pool;
    this.name = name;
  }

  async findOne(filter = {}, options = {}) {
    const docs = await this.findMatching(filter);
    const doc = docs[0] ?? null;
    return doc ? project(doc, options.projection) : null;
  }

  async insertOne(doc) {
    const id = String(doc._id ?? doc.id ?? randomUUID());
    const stored = { ...doc, _id: id, id: doc.id ?? id };

    await this.pool.query(
      `
        INSERT INTO app_documents (collection, id, doc, created_at, updated_at)
        VALUES ($1, $2, $3::jsonb, NOW(), NOW())
        ON CONFLICT (collection, id)
        DO UPDATE SET doc = EXCLUDED.doc, updated_at = NOW()
      `,
      [this.name, id, JSON.stringify(stored)],
    );

    return { insertedId: id };
  }

  async updateOne(filter, update, options = {}) {
    const existing = await this.findOne(filter);

    if (!existing) {
      if (!options.upsert) {
        return { matchedCount: 0, modifiedCount: 0, upsertedId: null };
      }

      const id = String(filter._id ?? update.$setOnInsert?._id ?? randomUUID());
      const next = applyUpdate({ _id: id, id }, update, true);
      await this.insertOne(next);
      return { matchedCount: 0, modifiedCount: 0, upsertedId: id };
    }

    const next = applyUpdate(existing, update, false);
    await this.insertOne(next);
    return { matchedCount: 1, modifiedCount: 1, upsertedId: null };
  }

  async deleteMany(filter = {}) {
    const docs = await this.findMatching(filter);

    for (const doc of docs) {
      await this.pool.query(
        `DELETE FROM app_documents WHERE collection = $1 AND id = $2`,
        [this.name, String(doc._id ?? doc.id)],
      );
    }

    return { deletedCount: docs.length };
  }

  async countDocuments(filter = {}) {
    return (await this.findMatching(filter)).length;
  }

  async findMatching(filter = {}) {
    if (filter._id && typeof filter._id !== "object") {
      const result = await this.pool.query(
        `SELECT doc FROM app_documents WHERE collection = $1 AND id = $2`,
        [this.name, String(filter._id)],
      );

      return result.rows
        .map((row) => row.doc)
        .filter((doc) => matchesFilter(doc, filter));
    }

    if (canUseJsonContainment(filter)) {
      const result = await this.pool.query(
        `SELECT doc FROM app_documents WHERE collection = $1 AND doc @> $2::jsonb`,
        [this.name, JSON.stringify(filter)],
      );

      return result.rows
        .map((row) => row.doc)
        .filter((doc) => matchesFilter(doc, filter));
    }

    const result = await this.pool.query(
      `SELECT doc FROM app_documents WHERE collection = $1`,
      [this.name],
    );

    return result.rows
      .map((row) => row.doc)
      .filter((doc) => matchesFilter(doc, filter));
  }
}

function applyUpdate(doc, update, isInsert) {
  const next = { ...doc };

  if (!hasUpdateOperator(update)) {
    return { ...update };
  }

  if (update.$set) {
    Object.assign(next, update.$set);
  }

  if (isInsert && update.$setOnInsert) {
    Object.assign(next, update.$setOnInsert);
  }

  if (update.$inc) {
    for (const [key, value] of Object.entries(update.$inc)) {
      next[key] = Number(next[key] ?? 0) + Number(value);
    }
  }

  return next;
}

function hasUpdateOperator(update) {
  return Object.keys(update).some((key) => key.startsWith("$"));
}

function project(doc, projection) {
  if (!projection) return doc;

  const entries = Object.entries(projection);
  const include = entries.some(([, value]) => value === 1 || value === true);

  if (!include) {
    const next = { ...doc };
    for (const [key, value] of entries) {
      if (value === 0 || value === false) delete next[key];
    }
    return next;
  }

  const next = {};
  for (const [key, value] of entries) {
    if (value === 1 || value === true) next[key] = doc[key];
  }
  return next;
}

function matchesFilter(doc, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    const value = doc[key];

    if (expected instanceof RegExp) {
      return typeof value === "string" && expected.test(value);
    }

    if (expected === null) {
      return value == null;
    }

    if (expected && typeof expected === "object" && !Array.isArray(expected)) {
      if ("$regex" in expected) {
        const regex = expected.$regex instanceof RegExp
          ? expected.$regex
          : new RegExp(String(expected.$regex), expected.$options ?? "");
        return typeof value === "string" && regex.test(value);
      }

      if ("$in" in expected) {
        return expected.$in.includes(value);
      }

      return Object.entries(expected).every(([nestedKey, nestedValue]) => {
        if (nestedKey === "$in") return nestedValue.includes(value);
        return value?.[nestedKey] === nestedValue;
      });
    }

    if (Array.isArray(value)) return value.includes(expected);
    return value === expected;
  });
}

function canUseJsonContainment(filter) {
  return Object.entries(filter).every(([, value]) => {
    if (value instanceof RegExp) return false;
    if (Array.isArray(value)) return true;
    if (value === null) return false;
    if (!value || typeof value !== "object") return true;
    return !Object.keys(value).some((key) => key.startsWith("$"));
  });
}
