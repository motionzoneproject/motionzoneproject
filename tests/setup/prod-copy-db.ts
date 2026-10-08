import { randomUUID } from "node:crypto";
import { afterAll } from "vitest";
import {
  cloneDatabase,
  dropDatabase,
  migrateDeploy,
  withDatabase,
} from "./db-admin";

// PROD_COPY_DATABASE_URL pekar på en databas återställd från en
// produktionsbackup. Den rörs aldrig: vi klonar den, migrerar klonen till
// branchens schema och kör testerna där.
const source = process.env.PROD_COPY_DATABASE_URL;

if (source) {
  const sourceName = new URL(source).pathname.slice(1);
  const adminUrl = withDatabase(source, "postgres");
  // Eget namn per körning, så att två samtidiga körningar inte krockar.
  const dbName = `${sourceName}_test_${randomUUID().replaceAll("-", "").slice(0, 8)}`;

  await cloneDatabase(adminUrl, sourceName, dbName);
  const url = withDatabase(source, dbName);
  migrateDeploy(url);

  process.env.DATABASE_URL = url;
  delete (globalThis as { prisma?: unknown }).prisma;

  afterAll(async () => {
    const { default: prisma } = await import("@/lib/prisma");
    await prisma.$disconnect();
    delete (globalThis as { prisma?: unknown }).prisma;
    await dropDatabase(adminUrl, dbName);
  });
}
