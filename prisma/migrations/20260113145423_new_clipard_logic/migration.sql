/*
  Warnings:

  - You are about to drop the column `useTotalCount` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `useTotalCount` on the `purchase` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "product" DROP COLUMN "useTotalCount";

-- AlterTable
ALTER TABLE "purchase" DROP COLUMN "useTotalCount";
