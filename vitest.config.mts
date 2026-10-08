import { defineConfig } from "vitest/config";

// Tre sviter:
//
// - unit:        rena funktioner, ingen databas.
// - integration: server actions mot en riktig Postgres. Varje testfil får en
//                egen databas, klonad från en mall som byggts med
//                `prisma migrate deploy`, så filerna kan köras parallellt och
//                aldrig ser varandras data. Kräver TEST_DATABASE_URL.
// - prod-copy:   migrationerna och felkontrollerna mot en kopia av en
//                produktionsbackup. Kräver PROD_COPY_DATABASE_URL och körs
//                bara lokalt — backupen innehåller persondata.
//
// Se tests/README.md.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["tests/setup/global-db.ts"],
          setupFiles: ["tests/setup/mocks.ts", "tests/setup/file-db.ts"],
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
      {
        extends: true,
        test: {
          name: "prod-copy",
          environment: "node",
          include: ["tests/prod-copy/**/*.test.ts"],
          setupFiles: ["tests/setup/mocks.ts", "tests/setup/prod-copy-db.ts"],
          testTimeout: 120_000,
          hookTimeout: 300_000,
          fileParallelism: false,
        },
      },
    ],
  },
});
