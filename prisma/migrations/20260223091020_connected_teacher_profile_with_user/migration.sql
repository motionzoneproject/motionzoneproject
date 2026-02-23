/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `teacher_profile` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `teacher_profile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "teacher_profile" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "teacher_profile_userId_key" ON "teacher_profile"("userId");

-- AddForeignKey
ALTER TABLE "teacher_profile" ADD CONSTRAINT "teacher_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
