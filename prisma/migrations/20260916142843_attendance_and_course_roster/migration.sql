-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT');

-- CreateEnum
CREATE TYPE "RosterStatus" AS ENUM ('ADDED', 'HIDDEN');

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "studentKey" TEXT NOT NULL,
    "userId" TEXT,
    "participantId" TEXT,
    "status" "AttendanceStatus" NOT NULL,
    "markedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_roster_entry" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentKey" TEXT NOT NULL,
    "userId" TEXT,
    "participantId" TEXT,
    "status" "RosterStatus" NOT NULL,
    "addedByUserId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_roster_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_lessonId_idx" ON "attendance"("lessonId");

-- CreateIndex
CREATE INDEX "attendance_userId_idx" ON "attendance"("userId");

-- CreateIndex
CREATE INDEX "attendance_participantId_idx" ON "attendance"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_lessonId_studentKey_key" ON "attendance"("lessonId", "studentKey");

-- CreateIndex
CREATE INDEX "course_roster_entry_courseId_idx" ON "course_roster_entry"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "course_roster_entry_courseId_studentKey_key" ON "course_roster_entry"("courseId", "studentKey");

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_markedByUserId_fkey" FOREIGN KEY ("markedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_roster_entry" ADD CONSTRAINT "course_roster_entry_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_roster_entry" ADD CONSTRAINT "course_roster_entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_roster_entry" ADD CONSTRAINT "course_roster_entry_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_roster_entry" ADD CONSTRAINT "course_roster_entry_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
