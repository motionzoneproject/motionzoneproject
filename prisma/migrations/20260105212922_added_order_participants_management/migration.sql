-- AlterTable
ALTER TABLE "order_item" ADD COLUMN     "participantId" TEXT;

-- AlterTable
ALTER TABLE "purchase" ADD COLUMN     "participantId" TEXT;

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

-- CreateIndex
CREATE INDEX "order_item_participantId_idx" ON "order_item"("participantId");

-- CreateIndex
CREATE INDEX "purchase_participantId_idx" ON "purchase"("participantId");

-- AddForeignKey
ALTER TABLE "purchase" ADD CONSTRAINT "purchase_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant" ADD CONSTRAINT "participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant" ADD CONSTRAINT "participant_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
