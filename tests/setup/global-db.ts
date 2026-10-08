import { randomUUID } from "node:crypto";
import type { TestProject } from "vitest/node";
import {
  adminQuery,
  dropDatabase,
  migrateDeploy,
  requireEnv,
  withDatabase,
} from "./db-admin";

declare module "vitest" {
  export interface ProvidedContext {
    /** Mallen som testfilerna i den här körningen klonar. */
    templateDb: string;
  }
}

// Bygger mallen en gång per körning. Varje testfil klonar den sedan
// (tests/setup/file-db.ts), vilket tar millisekunder. Mallen har ett eget
// namn per körning, så att två samtidiga körningar inte river varandras mall.
export default async function setup(project: TestProject) {
  const adminUrl = requireEnv("TEST_DATABASE_URL");
  const templateDb = `mz_test_tpl_${randomUUID().replaceAll("-", "").slice(0, 12)}`;

  await adminQuery(adminUrl, `CREATE DATABASE "${templateDb}"`);
  migrateDeploy(withDatabase(adminUrl, templateDb));
  project.provide("templateDb", templateDb);

  return async () => {
    await dropDatabase(adminUrl, templateDb);
  };
}
