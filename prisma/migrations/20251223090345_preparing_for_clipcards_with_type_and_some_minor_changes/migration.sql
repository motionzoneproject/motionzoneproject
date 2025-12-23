/*
  Warnings:

  - You are about to alter the column `totalPrice` on the `order` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `price` on the `order_item` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `price` on the `product` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - Made the column `updatedAt` on table `Event` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `Termin` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `order` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `order_item` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `product` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('COURSE', 'PACK', 'CLIP');

-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "Termin" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "course" ADD COLUMN     "maxCustomer" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "maxBookings" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "order" ALTER COLUMN "totalPrice" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "order_item" ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "product" ADD COLUMN     "maxCustomer" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "type" "ProductType" NOT NULL DEFAULT 'COURSE',
ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "product_on_course" ADD COLUMN     "type" "ProductType" NOT NULL DEFAULT 'COURSE',
ADD COLUMN     "unlimited" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "purchase" ADD COLUMN     "remainingCount" INTEGER,
ADD COLUMN     "totalCount" INTEGER,
ADD COLUMN     "type" "ProductType" NOT NULL DEFAULT 'COURSE',
ADD COLUMN     "useTotalCount" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "updatedAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "purchase_item" ADD COLUMN     "type" "ProductType" NOT NULL DEFAULT 'COURSE',
ADD COLUMN     "unlimited" BOOLEAN NOT NULL DEFAULT false;
