-- CreateEnum
CREATE TYPE "GalleryItemType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateTable
CREATE TABLE "gallery_item" (
    "id" TEXT NOT NULL,
    "type" "GalleryItemType" NOT NULL DEFAULT 'VIDEO',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_item_pkey" PRIMARY KEY ("id")
);
