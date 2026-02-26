/*
  Warnings:

  - Added the required column `active` to the `Studio` table without a default value. This is not possible if the table is not empty.
  - Added the required column `active` to the `Style` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Studio" ADD COLUMN     "active" BOOLEAN NOT NULL;

-- AlterTable
ALTER TABLE "Style" ADD COLUMN     "active" BOOLEAN NOT NULL;
