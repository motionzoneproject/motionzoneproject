import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { Client } from "pg";

/** Byter databasnamnet i en anslutningssträng. */
export function withDatabase(url: string, database: string): string {
  const u = new URL(url);
  u.pathname = `/${database}`;
  return u.toString();
}

/** Kör SQL mot databasen i URL:en. */
export async function adminQuery(url: string, sql: string): Promise<void> {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

export async function dropDatabase(adminUrl: string, name: string) {
  await adminQuery(adminUrl, `DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
}

/** Skapar `name` som en kopia av `template` — snabbt, även för stora mallar. */
export async function cloneDatabase(
  adminUrl: string,
  template: string,
  name: string,
) {
  await dropDatabase(adminUrl, name);
  await adminQuery(
    adminUrl,
    `CREATE DATABASE "${name}" TEMPLATE "${template}"`,
  );
}

/** Kör projektets riktiga migrationer, precis som `npm run build` gör. */
export function migrateDeploy(databaseUrl: string) {
  const prismaCli = createRequire(import.meta.url).resolve(
    "prisma/build/index.js",
  );
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "pipe",
  });
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} saknas. Se tests/README.md för hur testdatabasen sätts upp.`,
    );
  }
  return value;
}
