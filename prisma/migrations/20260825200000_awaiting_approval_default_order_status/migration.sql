-- AlterTable: new orders now start as AWAITING_APPROVAL instead of PENDING_PAYMENT
ALTER TABLE "order" ALTER COLUMN "status" SET DEFAULT 'AWAITING_APPROVAL';

-- DataMigration: move existing orders still sitting in the old initial state forward.
-- PENDING_PAYMENT is deprecated (kept in the enum for history) — the live status
-- lifecycle is now AWAITING_APPROVAL -> APPROVED | CANCELLED.
UPDATE "order" SET "status" = 'AWAITING_APPROVAL' WHERE "status" = 'PENDING_PAYMENT';