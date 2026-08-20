-- better-auth 1.7 added a required `issuer` column to the account table and
-- now resolves accounts on (issuer, accountId). Rows written before the
-- upgrade have no issuer, so sign-in cannot match them and every existing
-- user is locked out. Add the column nullable, backfill, then enforce.

-- AlterTable
ALTER TABLE "account" ADD COLUMN "issuer" TEXT;

-- Backfill. Only email/password is configured, so every existing row is the
-- "credential" provider and gets better-auth's synthetic local issuer
-- ("local:" + providerId). OAuth providers would instead use
-- "local:oauth:" + providerId -- add a branch here if a social provider is
-- ever enabled before this migration runs.
UPDATE "account"
SET "issuer" = 'local:' || "providerId"
WHERE "issuer" IS NULL;

ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "account_issuer_accountId_key" ON "account"("issuer", "accountId");
