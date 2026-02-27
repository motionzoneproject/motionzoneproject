/*
  Warnings:

  - You are about to drop the column `maxBookings` on the `course` table. All the data in the column will be lost.
  - You are about to drop the column `maxCustomer` on the `course` table. All the data in the column will be lost.
  - You are about to drop the column `maxBookings` on the `lesson` table. All the data in the column will be lost.
  - You are about to drop the column `maxBookings` on the `schema_item` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "course" DROP COLUMN "maxBookings",
DROP COLUMN "maxCustomer";

-- AlterTable
ALTER TABLE "lesson" DROP COLUMN "maxBookings";

-- AlterTable
ALTER TABLE "schema_item" DROP COLUMN "maxBookings";
