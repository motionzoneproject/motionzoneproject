/**
 * Skapar en låtsasadmin i din LOKALA databas så du (och Claude) kan logga in
 * och prova adminsidorna.
 *
 *   npm run seed:admin           # skapa/återställ kontot
 *   npm run seed:admin -- --clean # ta bort det igen
 *
 * Inloggning: admin@zztest.example.invalid / zztest-admin-1234
 *
 * VÄGRAR köra mot något annat än localhost.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL ?? "";

function assertLocalDatabase() {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    console.error("FEL: DATABASE_URL saknas eller går inte att tolka.");
    process.exit(1);
  }
  if (host !== "localhost" && host !== "127.0.0.1" && host !== "::1") {
    console.error(
      `FEL: DATABASE_URL pekar på "${host}", inte localhost.\n` +
        "Det här skriptet får bara köras mot en lokal utvecklingsdatabas.",
    );
    process.exit(1);
  }
}

assertLocalDatabase();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

const USER_ID = "zztest-admin-user";
const EMAIL = "admin@zztest.example.invalid";
const PASSWORD = "zztest-admin-1234";

async function clean() {
  // Konton och sessioner följer med (onDelete: Cascade).
  await prisma.user.deleteMany({ where: { id: USER_ID } });
}

async function main() {
  await clean();
  if (process.argv.includes("--clean")) {
    console.log("Testadmin borttagen.");
    return;
  }
  await prisma.user.create({
    data: {
      id: USER_ID,
      name: "[TEST] Admin Adminsson",
      email: EMAIL,
      emailVerified: true,
      role: "admin",
      accounts: {
        create: {
          id: `${USER_ID}-account`,
          accountId: USER_ID,
          providerId: "credential",
          password: await hashPassword(PASSWORD),
        },
      },
    },
  });
  console.log(`Klart. Logga in med ${EMAIL} / ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
