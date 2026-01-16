/*
  Warnings:

  - You are about to drop the `course_on_termin` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "course_on_termin" DROP CONSTRAINT "course_on_termin_courseId_fkey";

-- DropForeignKey
ALTER TABLE "course_on_termin" DROP CONSTRAINT "course_on_termin_terminId_fkey";

-- DropTable
DROP TABLE "course_on_termin";
