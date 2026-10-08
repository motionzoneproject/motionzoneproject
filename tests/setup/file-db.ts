import { randomUUID } from "node:crypto";
import { afterAll } from "vitest";
import {
  cloneDatabase,
  dropDatabase,
  requireEnv,
  withDatabase,
} from "./db-admin";

const TEMPLATE_DB = "mz_test_template";
const adminUrl = requireEnv("TEST_DATABASE_URL");
const dbName = `mz_test_${randomUUID().replaceAll("-", "").slice(0, 16)}`;

await cloneDatabase(adminUrl, TEMPLATE_DB, dbName);

// Måste sättas innan src/lib/prisma.ts laddas. Den cachar dessutom klienten
// på globalThis utanför produktion, och globalThis delas mellan testfiler i
// samma worker — utan rensningen skulle nästa fil prata med en borttagen
// databas.
process.env.DATABASE_URL = withDatabase(adminUrl, dbName);
delete (globalThis as { prisma?: unknown }).prisma;

afterAll(async () => {
  const { default: prisma } = await import("@/lib/prisma");
  await prisma.$disconnect();
  delete (globalThis as { prisma?: unknown }).prisma;
  await dropDatabase(adminUrl, dbName);
});
