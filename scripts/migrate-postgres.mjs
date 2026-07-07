/* global console, process */
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import pg from "pg";
import { ensurePgSeedSchema } from "./pg-document-db.mjs";

const { Pool } = pg;

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

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for Neon Postgres migrations.");
  }

  const pool = new Pool(getPoolConfig(process.env.DATABASE_URL));

  await ensurePgSeedSchema(pool);
  await pool.end();

  console.info("Neon Postgres schema is up to date.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

function getPoolConfig(connectionString) {
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
