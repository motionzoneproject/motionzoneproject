-- AlterTable
ALTER TABLE "course" ADD COLUMN     "deactivatedByCascade" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "product" ADD COLUMN     "deactivatedByCascade" BOOLEAN NOT NULL DEFAULT false;
