-- CreateEnum
CREATE TYPE "RosterStatus" AS ENUM ('ADDED', 'REMOVED');

-- CreateTable
CREATE TABLE "course_roster_entry" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentKey" TEXT NOT NULL,
    "userId" TEXT,
    "participantId" TEXT,
    "status" "RosterStatus" NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_roster_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_roster_entry_courseId_idx" ON "course_roster_entry"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "course_roster_entry_courseId_studentKey_key" ON "course_roster_entry"("courseId", "studentKey");

-- AddForeignKey
ALTER TABLE "course_roster_entry" ADD CONSTRAINT "course_roster_entry_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_roster_entry" ADD CONSTRAINT "course_roster_entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_roster_entry" ADD CONSTRAINT "course_roster_entry_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_roster_entry" ADD CONSTRAINT "course_roster_entry_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
