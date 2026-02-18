/*
  Warnings:

  - You are about to alter the column `totalPrice` on the `order` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to alter the column `price` on the `order_item` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to drop the column `terminId` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `useTotalCount` on the `product` table. All the data in the column will be lost.
  - You are about to alter the column `price` on the `product` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.
  - You are about to drop the column `bio` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `user` table. All the data in the column will be lost.
  - You are about to drop the `course_on_termin` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `updatedAt` on table `Event` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `Termin` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `order` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `order_item` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `product` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('COURSE', 'PACK', 'CLIP');

-- DropForeignKey
ALTER TABLE "course_on_termin" DROP CONSTRAINT "course_on_termin_courseId_fkey";

-- DropForeignKey
ALTER TABLE "course_on_termin" DROP CONSTRAINT "course_on_termin_terminId_fkey";

-- DropForeignKey
ALTER TABLE "product" DROP CONSTRAINT "product_terminId_fkey";

-- DropIndex
DROP INDEX "product_terminId_idx";

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
ALTER TABLE "order_item" ADD COLUMN     "participantId" TEXT,
ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "product" DROP COLUMN "terminId",
DROP COLUMN "useTotalCount",
ADD COLUMN     "imageURL" TEXT,
ADD COLUMN     "maxCustomer" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "type" "ProductType" NOT NULL DEFAULT 'COURSE',
ADD COLUMN     "unlimitedCustomers" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "product_on_course" ADD COLUMN     "unlimited" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "purchase" ADD COLUMN     "participantId" TEXT,
ADD COLUMN     "remainingCount" INTEGER,
ADD COLUMN     "totalCount" INTEGER,
ADD COLUMN     "type" "ProductType" NOT NULL DEFAULT 'COURSE',
ALTER COLUMN "updatedAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "purchase_item" ADD COLUMN     "type" "ProductType" NOT NULL DEFAULT 'COURSE',
ADD COLUMN     "unlimited" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "schema_item" ADD COLUMN     "customEndDate" TIMESTAMP(3),
ADD COLUMN     "customStartDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user" DROP COLUMN "bio",
DROP COLUMN "phone";

-- DropTable
DROP TABLE "course_on_termin";

-- CreateTable
CREATE TABLE "user_details" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phoneNumber" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "bio" TEXT,
    "allowPhotoVideo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "allowPhotoVideo" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "addedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_details_userId_key" ON "user_details"("userId");

-- CreateIndex
CREATE INDEX "order_item_participantId_idx" ON "order_item"("participantId");

-- CreateIndex
CREATE INDEX "purchase_participantId_idx" ON "purchase"("participantId");

-- AddForeignKey
ALTER TABLE "user_details" ADD CONSTRAINT "user_details_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase" ADD CONSTRAINT "purchase_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant" ADD CONSTRAINT "participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant" ADD CONSTRAINT "participant_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
