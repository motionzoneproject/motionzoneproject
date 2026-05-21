/*
  Warnings:

  - A unique constraint covering the columns `[schemaItemId,startTime]` on the table `lesson` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "lesson_schemaItemId_startTime_key" ON "lesson"("schemaItemId", "startTime");
