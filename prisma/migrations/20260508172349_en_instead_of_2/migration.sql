/*
  Warnings:

  - You are about to drop the column `description2` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `headline2` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `content2` on the `LegalPage` table. All the data in the column will be lost.
  - You are about to drop the column `title2` on the `LegalPage` table. All the data in the column will be lost.
  - You are about to drop the column `caption2` on the `Photo` table. All the data in the column will be lost.
  - You are about to drop the column `description2` on the `Photo` table. All the data in the column will be lost.
  - You are about to drop the column `feature1Description2` on the `StartPageContent` table. All the data in the column will be lost.
  - You are about to drop the column `feature1Title2` on the `StartPageContent` table. All the data in the column will be lost.
  - You are about to drop the column `feature2Description2` on the `StartPageContent` table. All the data in the column will be lost.
  - You are about to drop the column `feature2Title2` on the `StartPageContent` table. All the data in the column will be lost.
  - You are about to drop the column `feature3Description2` on the `StartPageContent` table. All the data in the column will be lost.
  - You are about to drop the column `feature3Title2` on the `StartPageContent` table. All the data in the column will be lost.
  - You are about to drop the column `featuresSubtext2` on the `StartPageContent` table. All the data in the column will be lost.
  - You are about to drop the column `featuresTitle2` on the `StartPageContent` table. All the data in the column will be lost.
  - You are about to drop the column `heroLabel2` on the `StartPageContent` table. All the data in the column will be lost.
  - You are about to drop the column `heroSubtext2` on the `StartPageContent` table. All the data in the column will be lost.
  - You are about to drop the column `heroTitleAccent2` on the `StartPageContent` table. All the data in the column will be lost.
  - You are about to drop the column `heroTitleLine1_2` on the `StartPageContent` table. All the data in the column will be lost.
  - You are about to drop the column `heroTitleLine2_2` on the `StartPageContent` table. All the data in the column will be lost.
  - You are about to drop the column `description2` on the `Studio` table. All the data in the column will be lost.
  - You are about to drop the column `name2` on the `Studio` table. All the data in the column will be lost.
  - You are about to drop the column `description2` on the `Style` table. All the data in the column will be lost.
  - You are about to drop the column `name2` on the `Style` table. All the data in the column will be lost.
  - You are about to drop the column `name2` on the `Termin` table. All the data in the column will be lost.
  - You are about to drop the column `description2` on the `course` table. All the data in the column will be lost.
  - You are about to drop the column `level2` on the `course` table. All the data in the column will be lost.
  - You are about to drop the column `name2` on the `course` table. All the data in the column will be lost.
  - You are about to drop the column `caption2` on the `gallery_item` table. All the data in the column will be lost.
  - You are about to drop the column `description2` on the `gallery_item` table. All the data in the column will be lost.
  - You are about to drop the column `title2` on the `gallery_item` table. All the data in the column will be lost.
  - You are about to drop the column `message2` on the `lesson` table. All the data in the column will be lost.
  - You are about to drop the column `description2` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `name2` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `place2` on the `schema_item` table. All the data in the column will be lost.
  - You are about to drop the column `description2` on the `teacher_profile` table. All the data in the column will be lost.
  - You are about to drop the column `specialty2` on the `teacher_profile` table. All the data in the column will be lost.
  - You are about to drop the column `bio2` on the `user_details` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "description2",
DROP COLUMN "headline2",
ADD COLUMN     "description_en" TEXT,
ADD COLUMN     "headline_en" TEXT;

-- AlterTable
ALTER TABLE "LegalPage" DROP COLUMN "content2",
DROP COLUMN "title2",
ADD COLUMN     "content_en" TEXT,
ADD COLUMN     "title_en" TEXT;

-- AlterTable
ALTER TABLE "Photo" DROP COLUMN "caption2",
DROP COLUMN "description2",
ADD COLUMN     "caption_en" TEXT,
ADD COLUMN     "description_en" TEXT;

-- AlterTable
ALTER TABLE "StartPageContent" DROP COLUMN "feature1Description2",
DROP COLUMN "feature1Title2",
DROP COLUMN "feature2Description2",
DROP COLUMN "feature2Title2",
DROP COLUMN "feature3Description2",
DROP COLUMN "feature3Title2",
DROP COLUMN "featuresSubtext2",
DROP COLUMN "featuresTitle2",
DROP COLUMN "heroLabel2",
DROP COLUMN "heroSubtext2",
DROP COLUMN "heroTitleAccent2",
DROP COLUMN "heroTitleLine1_2",
DROP COLUMN "heroTitleLine2_2",
ADD COLUMN     "feature1Description_e" TEXT DEFAULT 'Our teachers has a long experience and great passion for dancing.',
ADD COLUMN     "feature1Title_e" TEXT DEFAULT 'Professional instructors',
ADD COLUMN     "feature2Description_en" TEXT DEFAULT 'We have courses in all different times to suite your schedule. From morning to night, all days.',
ADD COLUMN     "feature2Title_en" TEXT DEFAULT 'Flexible lessontimes',
ADD COLUMN     "feature3Description_en" TEXT DEFAULT 'Our studio is equiped with the latest soundsystem and big mirrors for optimal training.',
ADD COLUMN     "feature3Title_en" TEXT DEFAULT 'Modern studios',
ADD COLUMN     "featuresSubtext_e" TEXT DEFAULT 'We offers an unique dance experience with world class intstructors and modern facilities',
ADD COLUMN     "featuresTitle_e" TEXT DEFAULT 'Why Motion Zone?',
ADD COLUMN     "heroLabel_en" TEXT DEFAULT 'Welcome to Motion Zone',
ADD COLUMN     "heroSubtext_e" TEXT DEFAULT 'Discover dance in a new way. Our studio offers courses for all ages and levels with professional instructors.',
ADD COLUMN     "heroTitleAccent_e" TEXT DEFAULT 'Passion',
ADD COLUMN     "heroTitleLine1_en" TEXT DEFAULT 'Dance is',
ADD COLUMN     "heroTitleLine2_en" TEXT DEFAULT 'Och Livet i Rörelse';

-- AlterTable
ALTER TABLE "Studio" DROP COLUMN "description2",
DROP COLUMN "name2",
ADD COLUMN     "description_en" TEXT,
ADD COLUMN     "name_en" TEXT;

-- AlterTable
ALTER TABLE "Style" DROP COLUMN "description2",
DROP COLUMN "name2",
ADD COLUMN     "description_en" TEXT,
ADD COLUMN     "name_en" TEXT;

-- AlterTable
ALTER TABLE "Termin" DROP COLUMN "name2",
ADD COLUMN     "name_en" TEXT;

-- AlterTable
ALTER TABLE "course" DROP COLUMN "description2",
DROP COLUMN "level2",
DROP COLUMN "name2",
ADD COLUMN     "description_en" TEXT,
ADD COLUMN     "level_en" TEXT,
ADD COLUMN     "name_en" TEXT;

-- AlterTable
ALTER TABLE "gallery_item" DROP COLUMN "caption2",
DROP COLUMN "description2",
DROP COLUMN "title2",
ADD COLUMN     "caption_en" TEXT,
ADD COLUMN     "description_en" TEXT,
ADD COLUMN     "title_en" TEXT;

-- AlterTable
ALTER TABLE "lesson" DROP COLUMN "message2",
ADD COLUMN     "message_en" TEXT;

-- AlterTable
ALTER TABLE "product" DROP COLUMN "description2",
DROP COLUMN "name2",
ADD COLUMN     "description_en" TEXT,
ADD COLUMN     "name_en" TEXT;

-- AlterTable
ALTER TABLE "schema_item" DROP COLUMN "place2",
ADD COLUMN     "place_en" TEXT;

-- AlterTable
ALTER TABLE "teacher_profile" DROP COLUMN "description2",
DROP COLUMN "specialty2",
ADD COLUMN     "description_en" TEXT,
ADD COLUMN     "specialty_en" TEXT;

-- AlterTable
ALTER TABLE "user_details" DROP COLUMN "bio2",
ADD COLUMN     "bio_en" TEXT;
