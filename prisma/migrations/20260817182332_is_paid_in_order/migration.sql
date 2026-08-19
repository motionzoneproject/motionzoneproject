-- AlterTable
ALTER TABLE "order" ADD COLUMN     "isPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paidAt" TIMESTAMP(3);

UPDATE "order"
SET "isPaid" = true,
    "paidAt" = COALESCE("paidAt", "updatedAt"),
    "status" = 'APPROVED'
WHERE "status" = 'PAID';
