-- better-auth 1.7.0-1.7.2 required an `issuer` column on account
-- (20260820113917_add_account_issuer_for_better_auth_1_7). 1.7.3 dropped it
-- again and never writes it, so with the column NOT NULL every sign-up
-- created the user row, then failed on the account row -- leaving a user who
-- cannot sign in and cannot sign up again. The schema now matches 1.6/1.7.3+.
-- See https://www.better-auth.com/docs/guides/1-7-upgrade-guide

-- DropIndex (before the column, per the upgrade guide)
DROP INDEX "account_issuer_accountId_key";

-- AlterTable
ALTER TABLE "account" DROP COLUMN "issuer";
