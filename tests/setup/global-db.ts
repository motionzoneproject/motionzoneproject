import {
  adminQuery,
  dropDatabase,
  migrateDeploy,
  requireEnv,
  withDatabase,
} from "./db-admin";

const TEMPLATE_DB = "mz_test_template";

// Bygger mallen en gång per körning. Varje testfil klonar den sedan
// (tests/setup/file-db.ts), vilket tar millisekunder.
export default async function setup() {
  const adminUrl = requireEnv("TEST_DATABASE_URL");

  await dropDatabase(adminUrl, TEMPLATE_DB);
  await adminQuery(adminUrl, `CREATE DATABASE "${TEMPLATE_DB}"`);
  migrateDeploy(withDatabase(adminUrl, TEMPLATE_DB));

  return async () => {
    await dropDatabase(adminUrl, TEMPLATE_DB);
  };
}
