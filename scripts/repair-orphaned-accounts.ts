import "dotenv/config";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * Repairs users who cannot sign in because their credential account row is
 * missing or does not match what better-auth 1.7 looks up.
 *
 * Sign-in in 1.7 resolves an account by
 *   providerId === "credential" && issuer === "local:credential" && accountId === user.id
 * and a user whose row fails that test gets "User not found" on sign-in and
 * "User already exists. Use another email." on sign-up -- a dead end, because
 * this app has no password-reset flow yet.
 *
 * Most of these were created while better-auth 1.7 was writing an `issuer`
 * column the schema did not have: sign-up wrote the user row, then failed on
 * linkAccount.
 *
 * This script never deletes a user and never touches orders. It only adds or
 * corrects the account row. A user who already has a working password keeps
 * it -- only a missing password is replaced with a generated one.
 *
 * Dry run (default): npx tsx scripts/repair-orphaned-accounts.ts
 * Apply:             npx tsx scripts/repair-orphaned-accounts.ts --apply
 */

const CREDENTIAL_ISSUER = "local:credential";
const APPLY = process.argv.includes("--apply");

type Plan = {
  userId: string;
  email: string;
  action: "create" | "fix-identity" | "set-password";
  detail: string;
  tempPassword?: string;
};

/** 18 bytes of base64url -- 24 chars, well past the 8 char minimum. */
function generatePassword() {
  return randomBytes(18).toString("base64url");
}

async function main() {
  const ctx = await auth.$context;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      accounts: {
        select: {
          id: true,
          providerId: true,
          issuer: true,
          accountId: true,
          password: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const plans: Plan[] = [];

  for (const user of users) {
    const signInMatch = user.accounts.find(
      (account) =>
        account.providerId === "credential" &&
        account.issuer === CREDENTIAL_ISSUER &&
        account.accountId === user.id,
    );

    if (signInMatch?.password) continue;

    if (signInMatch) {
      plans.push({
        userId: user.id,
        email: user.email,
        action: "set-password",
        detail: "credential account exists but has no password",
        tempPassword: generatePassword(),
      });
      continue;
    }

    // A credential row that exists but does not match the 1.7 lookup keeps its
    // password -- the user still knows it, only the identity columns are wrong.
    const staleCredential = user.accounts.find(
      (account) => account.providerId === "credential",
    );

    if (staleCredential) {
      plans.push({
        userId: user.id,
        email: user.email,
        action: "fix-identity",
        detail: `issuer=${staleCredential.issuer ?? "<null>"} accountId=${staleCredential.accountId} -- password kept`,
      });
      continue;
    }

    plans.push({
      userId: user.id,
      email: user.email,
      action: "create",
      detail: `no credential account (${user.accounts.length} other account row(s))`,
      tempPassword: generatePassword(),
    });
  }

  if (plans.length === 0) {
    console.log(`Checked ${users.length} users. Nothing to repair.`);
    return;
  }

  console.log(
    `Checked ${users.length} users. ${plans.length} cannot sign in:\n`,
  );
  console.table(
    plans.map((plan) => ({
      email: plan.email,
      action: plan.action,
      detail: plan.detail,
    })),
  );

  if (!APPLY) {
    console.log(
      "\nDry run -- nothing was written." +
        "\nRe-run with --apply to repair these users.",
    );
    return;
  }

  for (const plan of plans) {
    if (plan.action === "fix-identity") {
      await prisma.account.updateMany({
        where: { userId: plan.userId, providerId: "credential" },
        data: { issuer: CREDENTIAL_ISSUER, accountId: plan.userId },
      });
      continue;
    }

    const hashedPassword = await ctx.password.hash(plan.tempPassword as string);

    if (plan.action === "set-password") {
      await prisma.account.updateMany({
        where: { userId: plan.userId, providerId: "credential" },
        data: { password: hashedPassword },
      });
      continue;
    }

    await ctx.internalAdapter.createAccount({
      userId: plan.userId,
      providerId: "credential",
      issuer: CREDENTIAL_ISSUER,
      accountId: plan.userId,
      password: hashedPassword,
    });
  }

  const withPasswords = plans.filter((plan) => plan.tempPassword);

  console.log(`\nRepaired ${plans.length} user(s).`);

  if (withPasswords.length > 0) {
    console.log(
      "\nTemporary passwords -- shown once, send them over a channel the" +
        "\nuser already trusts and ask them to change it after signing in:\n",
    );
    console.table(
      withPasswords.map((plan) => ({
        email: plan.email,
        tempPassword: plan.tempPassword,
      })),
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
