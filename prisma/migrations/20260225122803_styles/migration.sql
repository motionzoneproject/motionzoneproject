-- CreateTable
CREATE TABLE "Style" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,

    CONSTRAINT "Style_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CourseToStyle" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CourseToStyle_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_StyleToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StyleToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CourseToStyle_B_index" ON "_CourseToStyle"("B");

-- CreateIndex
CREATE INDEX "_StyleToUser_B_index" ON "_StyleToUser"("B");

-- AddForeignKey
ALTER TABLE "_CourseToStyle" ADD CONSTRAINT "_CourseToStyle_A_fkey" FOREIGN KEY ("A") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseToStyle" ADD CONSTRAINT "_CourseToStyle_B_fkey" FOREIGN KEY ("B") REFERENCES "Style"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StyleToUser" ADD CONSTRAINT "_StyleToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Style"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StyleToUser" ADD CONSTRAINT "_StyleToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
