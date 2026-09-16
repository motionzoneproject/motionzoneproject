"use server";

import { revalidatePath } from "next/cache";
import type { AttendanceStatus } from "@/generated/prisma/enums";
import { handleClips } from "@/lib/clips";
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
 * En enskild lektion med elevlista och redan satt närvaro.
 *
 * Samma data som getAttendanceDay ger per lektion, men för den som kommer
 * från översikten eller lektionslistan och redan vet vilken lektion det är.
 *
 * @auth Admin eller lärare
 */
export async function getLessonAttendance(
  lessonId: string,
): Promise<AttendanceLesson | null> {
  const session = await requireTeacherOrAdmin();
  if (!session) return null;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      cancelled: true,
      message: true,
      courseId: true,
      teacherId: true,
      course: { select: { name: true } },
      teacher: { select: { name: true } },
      schemaItem: { select: { studio: { select: { name: true } } } },
    },
  });
  if (!lesson) return null;

  if (session.user.role !== "admin" && lesson.teacherId !== session.user.id) {
    return null;
  }

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

/**
 * Lämnar tillbaka tillfället för en elev som var frånvarande.
 *
 * Uteblivna pass ska normalt inte återbetalas — annars vore bokningen
 * meningslös — så det här sker aldrig av sig självt. Studion bedömer fallet
 * och trycker på knappen.
 *
 * Bokningen tas bort och saldot återställs, precis som när en elev plockas
 * bort från en lektion. Närvaroraden står kvar som frånvarande, så det finns
 * kvar en uppgift om att eleven var inbokad men inte kom. Och eftersom
 * knappen bara visas när det finns en bokning kvar går det inte att lämna
 * tillbaka samma tillfälle två gånger.
 *
 * @auth Admin eller lektionens lärare
 */
export async function releaseBookingForAbsence(
  lessonId: string,
  studentKey: string,
): Promise<Result> {
  const session = await requireTeacherOrAdmin();
  if (!session) return { success: false, msg: "Ingen behörighet." };

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, teacherId: true },
  });
  if (!lesson) return { success: false, msg: "Lektionen hittades inte." };

  if (session.user.role !== "admin" && lesson.teacherId !== session.user.id) {
    return { success: false, msg: "Det här är inte din lektion." };
  }

  const mark = await prisma.attendance.findUnique({
    where: { lessonId_studentKey: { lessonId, studentKey } },
    select: { status: true },
  });
  if (mark?.status !== "ABSENT") {
    return {
      success: false,
      msg: "Markera eleven som frånvarande och spara först.",
    };
  }

  // Bokningen tillhör elevens köp, och eleven är antingen en deltagare eller
  // ett konto — samma nyckel som resten av listan bygger på.
  const [kind, id] = studentKey.split(":");
  const booking = await prisma.booking.findFirst({
    where: {
      lessonId,
      purchaseItem: {
        purchase:
          kind === "participant"
            ? { participantId: id }
            : { userId: id, participantId: null },
      },
    },
    select: { id: true, purchaseItemId: true },
  });

  if (!booking) {
    return { success: false, msg: "Eleven har ingen bokning på lektionen." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const clipResult = await handleClips(tx, booking.purchaseItemId, 1);
      if (!clipResult.success) {
        throw new Error(clipResult.msg || "Kunde inte återställa saldo.");
      }
      await tx.booking.delete({ where: { id: booking.id } });
    });
  } catch (e) {
    console.error("Kunde inte lämna tillbaka tillfället", e);
    return { success: false, msg: "Kunde inte lämna tillbaka tillfället." };
  }

  revalidatePath("/admin/attendance");
  revalidatePath("/admin/lectures");
  revalidatePath("/user");

  return { success: true, msg: "Tillfället är tillbaka på elevens saldo." };
}

/**
 * Kundens egen närvaro, för profilsidan.
 *
 * Nyckeln är lektionen, eftersom kunden bara ser sina egna och sina
 * deltagares bokningar och aldrig har två på samma lektion. Saknas en rad
 * har läraren inte tagit närvaro — det är inte samma sak som frånvaro, och
 * ska inte visas som det.
 */
export async function getMyAttendance(): Promise<
  Record<string, "PRESENT" | "ABSENT">
> {
  const session = await getSessionData();
  if (!session) return {};

  const marks = await prisma.attendance.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        { participant: { addedByUserId: session.user.id } },
        { participant: { userId: session.user.id } },
      ],
    },
    select: { lessonId: true, status: true },
  });

  return Object.fromEntries(marks.map((m) => [m.lessonId, m.status]));
}
