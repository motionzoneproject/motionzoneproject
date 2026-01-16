/*
  Warnings:

  - You are about to drop the column `terminId` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `product_on_course` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "product" DROP CONSTRAINT "product_terminId_fkey";

-- DropIndex
DROP INDEX "product_terminId_idx";

-- AlterTable
ALTER TABLE "product" DROP COLUMN "terminId";

-- AlterTable
ALTER TABLE "product_on_course" DROP COLUMN "type";
