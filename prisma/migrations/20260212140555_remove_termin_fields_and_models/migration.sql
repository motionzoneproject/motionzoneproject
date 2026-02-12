/*
  Warnings:

  - You are about to drop the column `terminId` on the `product` table. All the data in the column will be lost.
  - You are about to drop the `course_on_termin` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "course_on_termin" DROP CONSTRAINT "course_on_termin_courseId_fkey";

-- DropForeignKey
ALTER TABLE "course_on_termin" DROP CONSTRAINT "course_on_termin_terminId_fkey";

-- DropForeignKey
ALTER TABLE "product" DROP CONSTRAINT "product_terminId_fkey";

-- DropIndex
DROP INDEX "product_terminId_idx";

-- AlterTable
ALTER TABLE "product" DROP COLUMN "terminId";

-- DropTable
DROP TABLE "course_on_termin";
