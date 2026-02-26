/*
  Warnings:

  - You are about to drop the `Studios` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Studios";

-- CreateTable
CREATE TABLE "Studio" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,

    CONSTRAINT "Studio_pkey" PRIMARY KEY ("id")
);
