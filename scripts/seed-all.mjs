/* global console, process */
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

const optional = process.argv.includes("--if-available");

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

function runNodeScript(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${script} exited with code ${code ?? "unknown"}`));
    });
  });
}

async function main() {
  await loadEnv();

  if (process.env.SKIP_AUTO_SEED === "true") {
    console.info("Skipping CampusHub automatic seed because SKIP_AUTO_SEED=true.");
    return;
  }

  try {
    await runNodeScript("scripts/migrate-postgres.mjs");
    await runNodeScript("scripts/seed-test-accounts.mjs");
  } catch (error) {
    if (optional) {
      console.warn(
        `Skipping CampusHub automatic seed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return;
    }

    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
