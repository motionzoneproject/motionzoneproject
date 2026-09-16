"use server";

import { revalidatePath } from "next/cache";
import type { AttendanceStatus } from "@/generated/prisma/enums";
import { getCourseRoster, type RosterStudent } from "@/lib/course-roster";
import {
  endOfStockholmDateInput,
  parseStockholmDateInput,
} from "@/lib/date-utils";
import prisma from "../prisma";
import { getSessionData } from "./sessiondata";

type Result = { success: boolean; msg: string };

export type AttendanceLesson = {
  lessonId: string;
  courseId: string;
  courseName: string;
  studioName: string | null;
  teacherName: string;
  startTime: Date;
  endTime: Date;
  cancelled: boolean;
  message: string | null;
  students: (RosterStudent & { status: AttendanceStatus | null })[];
};

async function requireTeacherOrAdmin() {
  const session = await getSessionData();
  if (!session) return null;
  if (session.user.role !== "admin" && session.user.role !== "teacher") {
    return null;
  }
  return session;
}

/**
 * Dagens lektioner med elevlista och redan satt närvaro.
 *
 * En lärare ser bara sina egna lektioner. En admin ser alla, eller en viss
 * lärares om teacherId anges.
 *
 * @auth Admin eller lärare
 */
export async function getAttendanceDay(
  dateInput: string,
  teacherId?: string,
): Promise<AttendanceLesson[]> {
  const session = await requireTeacherOrAdmin();
  if (!session) return [];

  const isTeacher = session.user.role === "teacher";
  const scopedTeacherId = isTeacher ? session.user.id : teacherId;

  const lessons = await prisma.lesson.findMany({
    where: {
      startTime: {
        gte: parseStockholmDateInput(dateInput),
        lte: endOfStockholmDateInput(dateInput),
      },
      ...(scopedTeacherId ? { teacherId: scopedTeacherId } : {}),
    },
    orderBy: { startTime: "asc" },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      cancelled: true,
      message: true,
      courseId: true,
      course: { select: { name: true } },
      teacher: { select: { name: true } },
      schemaItem: { select: { studio: { select: { name: true } } } },
    },
  });

  return Promise.all(
    lessons.map(async (lesson) => {
      const [roster, marks] = await Promise.all([
        getCourseRoster(lesson.courseId, lesson.id),
        prisma.attendance.findMany({
          where: { lessonId: lesson.id },
          select: { studentKey: true, status: true },
        }),
      ]);

      const byKey = new Map(marks.map((m) => [m.studentKey, m.status]));

      return {
        lessonId: lesson.id,
        courseId: lesson.courseId,
        courseName: lesson.course.name,
        studioName: lesson.schemaItem.studio?.name ?? null,
        teacherName: lesson.teacher.name,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        cancelled: lesson.cancelled,
        message: lesson.message,
        students: roster.map((student) => ({
          ...student,
          status: byKey.get(student.studentKey) ?? null,
        })),
      };
    }),
  );
}

/**
 * Sparar närvaron för en hel lektion i ett svep.
 *
 * Rör varken bokningar eller klipp. Att markera någon som närvarande är ett
 * konstaterande, inte ett köp — därför kan även en elev som lagts till i
 * listan för hand bockas i, trots att hen inte har någon kursrad.
 *
 * @auth Admin eller lektionens lärare
 */
export async function saveAttendance(
  lessonId: string,
  marks: { studentKey: string; present: boolean }[],
): Promise<Result> {
  const session = await requireTeacherOrAdmin();
  if (!session) return { success: false, msg: "Ingen behörighet." };

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, teacherId: true, courseId: true },
  });
  if (!lesson) return { success: false, msg: "Lektionen hittades inte." };

  if (session.user.role !== "admin" && lesson.teacherId !== session.user.id) {
    return { success: false, msg: "Det här är inte din lektion." };
  }

  // Bara elever som finns i kursens lista får markeras, så en manipulerad
  // nyckel inte kan skapa närvaro för vem som helst.
  const roster = await getCourseRoster(lesson.courseId);
  const allowed = new Map(roster.map((s) => [s.studentKey, s]));

  const valid = marks.filter((mark) => allowed.has(mark.studentKey));
  if (valid.length === 0) {
    return { success: false, msg: "Inga elever att spara närvaro för." };
  }

  await prisma.$transaction(
    valid.map((mark) => {
      const student = allowed.get(mark.studentKey);
      const status: AttendanceStatus = mark.present ? "PRESENT" : "ABSENT";

      return prisma.attendance.upsert({
        where: {
          lessonId_studentKey: { lessonId, studentKey: mark.studentKey },
        },
        update: { status, markedByUserId: session.user.id },
        create: {
          lessonId,
          studentKey: mark.studentKey,
          userId: student?.userId ?? null,
          participantId: student?.participantId ?? null,
          status,
          markedByUserId: session.user.id,
        },
      });
    }),
  );

  revalidatePath("/admin/attendance");

  const present = valid.filter((m) => m.present).length;
  return {
    success: true,
    msg: `Närvaron är sparad: ${present} av ${valid.length} närvarande.`,
  };
}
