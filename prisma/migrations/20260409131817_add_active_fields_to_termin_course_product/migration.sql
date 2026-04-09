-- AlterTable
ALTER TABLE "Termin" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "course" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "product" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;
