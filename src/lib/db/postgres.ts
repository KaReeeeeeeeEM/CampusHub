import { Pool, type QueryResultRow } from "pg";
import { Kysely, PostgresDialect } from "kysely";

const globalForPostgres = globalThis as typeof globalThis & {
  campushubPgPool?: Pool;
  campushubKysely?: Kysely<Record<string, unknown>>;
  campushubPgReady?: Promise<void>;
};

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is required to connect CampusHub to Neon Postgres.");
  }

  return url;
}

function getPoolConfig() {
  const connectionString = getDatabaseUrl();
  const hostaddr = process.env.DATABASE_HOSTADDR;

  if (!hostaddr) {
    return {
      connectionString,
      max: 10,
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
    max: 10,
    ssl: {
      rejectUnauthorized: false,
      servername: url.hostname,
    },
  };
}

export function getPostgresPool() {
  if (!globalForPostgres.campushubPgPool) {
    globalForPostgres.campushubPgPool = new Pool(getPoolConfig());
  }

  return globalForPostgres.campushubPgPool;
}

export function getKyselyDb() {
  if (!globalForPostgres.campushubKysely) {
    globalForPostgres.campushubKysely = new Kysely<Record<string, unknown>>({
      dialect: new PostgresDialect({
        pool: getPostgresPool(),
      }),
    });
  }

  return globalForPostgres.campushubKysely;
}

export async function connectPostgres() {
  if (!globalForPostgres.campushubPgReady) {
    globalForPostgres.campushubPgReady = ensurePostgresSchema();
  }

  await globalForPostgres.campushubPgReady;
}

export async function ensurePostgresSchema() {
  const pool = getPostgresPool();

  await ensureBetterAuthSchema(pool);

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

  await pool.query(`
    CREATE INDEX IF NOT EXISTS app_documents_collection_idx
      ON app_documents (collection)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS app_documents_doc_gin_idx
      ON app_documents USING GIN (doc jsonb_path_ops)
  `);
}

async function ensureBetterAuthSchema(pool: Pool) {
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

  await pool.query(`CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "twoFactor_secret_idx" ON "twoFactor" ("secret")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "twoFactor_userId_idx" ON "twoFactor" ("userId")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "passkey_userId_idx" ON "passkey" ("userId")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "passkey_credentialID_idx" ON "passkey" ("credentialID")`);
}

export async function queryPostgres<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  await connectPostgres();
  return getPostgresPool().query<T>(text, values);
}
