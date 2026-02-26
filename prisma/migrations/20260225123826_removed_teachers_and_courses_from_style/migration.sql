/*
  Warnings:

  - You are about to drop the `_CourseToStyle` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_StyleToUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_CourseToStyle" DROP CONSTRAINT "_CourseToStyle_A_fkey";

-- DropForeignKey
ALTER TABLE "_CourseToStyle" DROP CONSTRAINT "_CourseToStyle_B_fkey";

-- DropForeignKey
ALTER TABLE "_StyleToUser" DROP CONSTRAINT "_StyleToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "_StyleToUser" DROP CONSTRAINT "_StyleToUser_B_fkey";

-- DropTable
DROP TABLE "_CourseToStyle";

-- DropTable
DROP TABLE "_StyleToUser";
