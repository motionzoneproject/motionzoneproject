-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "description2" TEXT,
ADD COLUMN     "headline2" TEXT;

-- AlterTable
ALTER TABLE "LegalPage" ADD COLUMN     "content2" TEXT,
ADD COLUMN     "title2" TEXT;

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "caption2" TEXT,
ADD COLUMN     "description2" TEXT;

-- AlterTable
ALTER TABLE "StartPageContent" ADD COLUMN     "feature1Description2" TEXT DEFAULT 'Our teachers has a long experience and great passion for dancing.',
ADD COLUMN     "feature1Title2" TEXT DEFAULT 'Professional instructors',
ADD COLUMN     "feature2Description2" TEXT DEFAULT 'We have courses in all different times to suite your schedule. From morning to night, all days.',
ADD COLUMN     "feature2Title2" TEXT DEFAULT 'Flexible lessontimes',
ADD COLUMN     "feature3Description2" TEXT DEFAULT 'Our studio is equiped with the latest soundsystem and big mirrors for optimal training.',
ADD COLUMN     "feature3Title2" TEXT DEFAULT 'Modern studios',
ADD COLUMN     "featuresSubtext2" TEXT DEFAULT 'We offers an unique dance experience with world class intstructors and modern facilities',
ADD COLUMN     "featuresTitle2" TEXT DEFAULT 'Why Motion Zone?',
ADD COLUMN     "heroLabel2" TEXT DEFAULT 'Welcome to Motion Zone',
ADD COLUMN     "heroSubtext2" TEXT DEFAULT 'Discover dance in a new way. Our studio offers courses for all ages and levels with professional instructors.',
ADD COLUMN     "heroTitleAccent2" TEXT DEFAULT 'Passion',
ADD COLUMN     "heroTitleLine1_2" TEXT DEFAULT 'Dance is',
ADD COLUMN     "heroTitleLine2_2" TEXT DEFAULT 'Och Livet i Rörelse';

-- AlterTable
ALTER TABLE "Studio" ADD COLUMN     "description2" TEXT,
ADD COLUMN     "name2" TEXT;

-- AlterTable
ALTER TABLE "Style" ADD COLUMN     "description2" TEXT,
ADD COLUMN     "name2" TEXT;

-- AlterTable
ALTER TABLE "Termin" ADD COLUMN     "name2" TEXT;

-- AlterTable
ALTER TABLE "course" ADD COLUMN     "description2" TEXT,
ADD COLUMN     "level2" TEXT,
ADD COLUMN     "name2" TEXT;

-- AlterTable
ALTER TABLE "gallery_item" ADD COLUMN     "caption2" TEXT,
ADD COLUMN     "description2" TEXT,
ADD COLUMN     "title2" TEXT;

-- AlterTable
ALTER TABLE "lesson" ADD COLUMN     "message2" TEXT;

-- AlterTable
ALTER TABLE "product" ADD COLUMN     "description2" TEXT,
ADD COLUMN     "name2" TEXT;

-- AlterTable
ALTER TABLE "schema_item" ADD COLUMN     "place2" TEXT;

-- AlterTable
ALTER TABLE "teacher_profile" ADD COLUMN     "description2" TEXT,
ADD COLUMN     "specialty2" TEXT;

-- AlterTable
ALTER TABLE "user_details" ADD COLUMN     "bio2" TEXT;
