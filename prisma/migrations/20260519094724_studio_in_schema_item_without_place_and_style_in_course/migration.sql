/*
  Warnings:

  - You are about to drop the column `place` on the `schema_item` table. All the data in the column will be lost.
  - You are about to drop the column `place_en` on the `schema_item` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "course" ADD COLUMN     "styleId" TEXT;

-- AlterTable
ALTER TABLE "schema_item" DROP COLUMN "place",
DROP COLUMN "place_en",
ADD COLUMN     "studioId" TEXT;

-- AddForeignKey
ALTER TABLE "schema_item" ADD CONSTRAINT "schema_item_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course" ADD CONSTRAINT "course_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
