/*
  Warnings:

  - You are about to drop the column `feature1Description_e` on the `StartPageContent` table. All the data in the column will be lost.
  - You are about to drop the column `feature1Title_e` on the `StartPageContent` table. All the data in the column will be lost.
  - You are about to drop the column `featuresSubtext_e` on the `StartPageContent` table. All the data in the column will be lost.
  - You are about to drop the column `featuresTitle_e` on the `StartPageContent` table. All the data in the column will be lost.
  - You are about to drop the column `heroSubtext_e` on the `StartPageContent` table. All the data in the column will be lost.
  - You are about to drop the column `heroTitleAccent_e` on the `StartPageContent` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StartPageContent" DROP COLUMN "feature1Description_e",
DROP COLUMN "feature1Title_e",
DROP COLUMN "featuresSubtext_e",
DROP COLUMN "featuresTitle_e",
DROP COLUMN "heroSubtext_e",
DROP COLUMN "heroTitleAccent_e",
ADD COLUMN     "feature1Description_en" TEXT DEFAULT 'Our teachers has a long experience and great passion for dancing.',
ADD COLUMN     "feature1Title_en" TEXT DEFAULT 'Professional instructors',
ADD COLUMN     "featuresSubtext_en" TEXT DEFAULT 'We offers an unique dance experience with world class intstructors and modern facilities',
ADD COLUMN     "featuresTitle_en" TEXT DEFAULT 'Why Motion Zone?',
ADD COLUMN     "heroSubtext_en" TEXT DEFAULT 'Discover dance in a new way. Our studio offers courses for all ages and levels with professional instructors.',
ADD COLUMN     "heroTitleAccent_en" TEXT DEFAULT 'Passion';
