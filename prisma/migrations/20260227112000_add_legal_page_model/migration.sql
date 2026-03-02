-- DropForeignKey (if Photo table exists from a previous migration)
ALTER TABLE IF EXISTS "Photo" DROP CONSTRAINT IF EXISTS "Photo_eventId_fkey";

-- DropTable (if Photo table exists from a previous migration)
DROP TABLE IF EXISTS "Photo";

-- CreateTable
CREATE TABLE "LegalPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalPage_slug_key" ON "LegalPage"("slug");
