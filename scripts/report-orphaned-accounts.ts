import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

/**
 * Read-only report. Lists users that have no account row, i.e. users that can
 * never sign in.
 *
 * They exist because better-auth 1.7 started writing an `issuer` column the
 * Prisma schema did not have: sign-up created the user row, then blew up on
 * `linkAccount`, leaving the user behind with no credentials. Retrying the
 * same email then hits "User already exists. Use another email.".
 *
 * This script only reads. It deletes nothing and changes nothing -- decide
 * per user whether to reset the password or remove the row by hand.
 *
 * Run with: npx tsx scripts/report-orphaned-accounts.ts
 */
async function main() {
  const orphans = await prisma.user.findMany({
    where: { accounts: { none: {} } },
    select: { id: true, email: true, name: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (orphans.length === 0) {
    console.log("No orphaned users found.");
    return;
  }

  console.log(`${orphans.length} user(s) without an account row:\n`);
  console.table(
    orphans.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    })),
  );
  console.log(
    "\nNothing was changed. These users cannot sign in until they get an" +
      "\naccount row -- either let them sign up again on a fresh email, or" +
      "\nremove the row manually after checking it holds no orders.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
