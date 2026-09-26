"use server";

import { revalidatePath } from "next/cache";
import type { AttendanceStatus } from "@/generated/prisma/enums";
import { handleClips } from "@/lib/clips";
import { studentKeyOf } from "@/lib/course-roster";
import { loadCourseRoster } from "@/lib/course-roster-data";
import {
  endOfStockholmDateInput,
  parseStockholmDateInput,
} from "@/lib/date-utils";
import { getCourseName } from "@/lib/tools";
import prisma from "../prisma";
import { showRemaining } from "./purchase-helpers";
import { getSessionData } from "./sessiondata";

type Result = { success: boolean; msg: string };

export type AttendanceStudent = {
  studentKey: string;
  userId: string | null;
  participantId: string | null;
  name: string;
  customerName: string | null;
  /** Saldot som text, "∞" för obegränsat. Null utan köp. */
  remaining: string | null;
  addedManually: boolean;
  /**
   * Står i kursens elevlista. Den som inte gör det finns med för att hen
   * redan har en markering på lektionen — till exempel en elev som tagits
   * bort från kursen efteråt.
   */
  inCourse: boolean;
  status: AttendanceStatus | null;
};

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
  students: AttendanceStudent[];
};

const lessonSelect = {
  id: true,
  startTime: true,
  endTime: true,
  cancelled: true,
  message: true,
  courseId: true,
  teacherId: true,
  course: {
    select: {
      teacherId: true,
      name: true,
      minAge: true,
      maxAge: true,
      adult: true,
      level: true,
    },
  },
  teacher: { select: { name: true } },
  schemaItem: { select: { studio: { select: { name: true } } } },
} as const;

async function requireTeacherOrAdmin() {
  const session = await getSessionData();
  if (!session) return null;
  if (session.user.role !== "admin" && session.user.role !== "teacher") {
    return null;
  }
  return session;
}

/** Admin, lektionens lärare eller kursens lärare. */
function mayTakeAttendance(
  session: { user: { id: string; role?: string | null } },
  lesson: { teacherId: string; course: { teacherId: string | null } },
) {
  return (
    session.user.role === "admin" ||
    lesson.teacherId === session.user.id ||
    lesson.course.teacherId === session.user.id
  );
}

/**
 * Elevlistan för en lektion.
 *
 * Kursens elever — samma lista som "Hantera elever" och elevlistan filtrerad
 * på kursen. Bokningarna spelar ingen roll här: närvaron är ett eget register.
 * Utöver kursens elever står den med som redan har en markering på
 * lektionen, så att en elev som tagits bort från kursen efteråt inte
 * försvinner ur de lektioner hen faktiskt gick.
 */
async function lessonStudents(lesson: {
  id: string;
  courseId: string;
}): Promise<AttendanceStudent[]> {
  const [roster, marks] = await Promise.all([
    loadCourseRoster(lesson.courseId),
    prisma.attendance.findMany({
      where: { lessonId: lesson.id },
      select: {
        studentKey: true,
        status: true,
        userId: true,
        participantId: true,
        user: { select: { name: true } },
        participant: {
          select: { name: true, addedBy: { select: { name: true } } },
        },
      },
    }),
  ]);

  const statusByKey = new Map(marks.map((m) => [m.studentKey, m.status]));
  const students = new Map<string, AttendanceStudent>();

  for (const s of roster?.students ?? []) {
    students.set(s.studentKey, {
      studentKey: s.studentKey,
      userId: s.userId,
      participantId: s.participantId,
      name: s.name,
      customerName: s.customerName,
      remaining:
        s.remaining === null ? null : String(showRemaining(s.remaining)),
      addedManually: s.addedManually,
      inCourse: true,
      status: null,
    });
  }

  for (const mark of marks) {
    if (students.has(mark.studentKey)) continue;
    const name = mark.participant?.name ?? mark.user?.name;
    if (!name) continue;
    students.set(mark.studentKey, {
      studentKey: mark.studentKey,
      userId: mark.userId,
      participantId: mark.participantId,
      name,
      customerName: mark.participant?.addedBy.name ?? null,
      remaining: null,
      addedManually: false,
      inCourse: false,
      status: null,
    });
  }

  return [...students.values()]
    .map((s) => ({ ...s, status: statusByKey.get(s.studentKey) ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));
}

async function toAttendanceLesson(lesson: {
  id: string;
  courseId: string;
  startTime: Date;
  endTime: Date;
  cancelled: boolean;
  message: string | null;
  course: Parameters<typeof getCourseName>[0];
  teacher: { name: string };
  schemaItem: { studio: { name: string } | null };
}): Promise<AttendanceLesson> {
  return {
    lessonId: lesson.id,
    courseId: lesson.courseId,
    courseName: getCourseName(lesson.course),
    studioName: lesson.schemaItem.studio?.name ?? null,
    teacherName: lesson.teacher.name,
    startTime: lesson.startTime,
    endTime: lesson.endTime,
    cancelled: lesson.cancelled,
    message: lesson.message,
    students: await lessonStudents(lesson),
  };
}

/**
 * Dagens lektioner med elevlista och redan satt närvaro.
 *
 * En lärare ser sina egna lektioner — de hen håller och de i hens kurser. En
 * admin ser alla, eller en viss lärares om teacherId anges.
 *
 * @auth Admin eller lärare
 */
export async function getAttendanceDay(
  dateInput: string,
  teacherId?: string,
): Promise<AttendanceLesson[]> {
  const session = await requireTeacherOrAdmin();
  if (!session) return [];

  const scopedTeacherId =
    session.user.role === "teacher" ? session.user.id : teacherId;

  const lessons = await prisma.lesson.findMany({
    where: {
      startTime: {
        gte: parseStockholmDateInput(dateInput),
        lte: endOfStockholmDateInput(dateInput),
      },
      ...(scopedTeacherId
        ? {
            OR: [
              { teacherId: scopedTeacherId },
              { course: { teacherId: scopedTeacherId } },
            ],
          }
        : {}),
    },
    orderBy: { startTime: "asc" },
    select: lessonSelect,
  });

  return Promise.all(lessons.map(toAttendanceLesson));
}

/**
 * En enskild lektion med elevlista och redan satt närvaro, för den som kommer
 * från översikten eller lektionslistan och redan vet vilken lektion det är.
 *
 * @auth Admin eller lektionens lärare
 */
export async function getLessonAttendance(
  lessonId: string,
): Promise<AttendanceLesson | null> {
  const session = await requireTeacherOrAdmin();
  if (!session) return null;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: lessonSelect,
  });
  if (!lesson || !mayTakeAttendance(session, lesson)) return null;

  return toAttendanceLesson(lesson);
}

/**
 * Sparar närvaron för en hel lektion i ett svep.
 *
 * Rör varken bokningar eller klipp. Att markera någon som närvarande är ett
 * konstaterande, inte ett köp — därför kan även en elev som lagts till i
 * kursen för hand bockas i, trots att hen inte har någon bokning.
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
    select: lessonSelect,
  });
  if (!lesson) return { success: false, msg: "Lektionen hittades inte." };
  if (!mayTakeAttendance(session, lesson)) {
    return { success: false, msg: "Det här är inte din lektion." };
  }

  // Bara elever som står på lektionens lista får markeras, så en manipulerad
  // nyckel inte kan skapa närvaro för vem som helst.
  const allowed = new Map(
    (await lessonStudents(lesson)).map((s) => [s.studentKey, s]),
  );
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
  revalidatePath("/user");

  const present = valid.filter((m) => m.present).length;
  return {
    success: true,
    msg: `Närvaron är sparad: ${present} av ${valid.length} närvarande.`,
  };
}

export type BookingAttendance = {
  /** Någon på lektionen har markerats, alltså är närvaron tagen. */
  taken: boolean;
  byStudentKey: Record<string, AttendanceStatus>;
};

/**
 * Närvaron på en lektion per elev, för bokningsdialogen.
 *
 * Bokningarna och närvaron hålls isär. Dialogen visar bara bredvid varje
 * bokning om eleven markerats, så att studion ser vilka bokningar som saknar
 * närvaro.
 *
 * @auth Admin eller lektionens lärare
 */
export async function getBookingAttendance(
  lessonId: string,
): Promise<BookingAttendance> {
  const empty = { taken: false, byStudentKey: {} };
  const session = await requireTeacherOrAdmin();
  if (!session) return empty;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { teacherId: true, course: { select: { teacherId: true } } },
  });
  if (!lesson || !mayTakeAttendance(session, lesson)) return empty;

  const marks = await prisma.attendance.findMany({
    where: { lessonId },
    select: { studentKey: true, status: true },
  });

  return {
    taken: marks.length > 0,
    byStudentKey: Object.fromEntries(
      marks.map((m) => [m.studentKey, m.status]),
    ),
  };
}

/**
 * Tar bort bokningarna på en lektion där eleven inte markerats som
 * närvarande, och lägger tillbaka tillfällena på elevernas saldon — samma sak
 * som papperskorgen gör, för alla på en gång.
 *
 * Görs bara på studions uttryckliga begäran, och bara när närvaron är tagen
 * på lektionen. Annars går det inte att skilja en elev som inte kom från en
 * lektion där ingen bockat av, och då skulle alla bokningar försvinna.
 *
 * @auth Admin eller lektionens lärare
 */
export async function removeBookingsWithoutAttendance(
  lessonId: string,
): Promise<Result> {
  const session = await requireTeacherOrAdmin();
  if (!session) return { success: false, msg: "Ingen behörighet." };

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { teacherId: true, course: { select: { teacherId: true } } },
  });
  if (!lesson) return { success: false, msg: "Lektionen hittades inte." };
  if (!mayTakeAttendance(session, lesson)) {
    return { success: false, msg: "Det här är inte din lektion." };
  }

  const [marks, bookings] = await Promise.all([
    prisma.attendance.findMany({
      where: { lessonId },
      select: { studentKey: true, status: true },
    }),
    prisma.booking.findMany({
      where: { lessonId, cancelled: false },
      select: {
        id: true,
        purchaseItemId: true,
        purchaseItem: {
          select: {
            purchase: { select: { userId: true, participantId: true } },
          },
        },
      },
    }),
  ]);

  if (marks.length === 0) {
    return { success: false, msg: "Närvaron är inte tagen på lektionen ännu." };
  }

  const present = new Set(
    marks.filter((m) => m.status === "PRESENT").map((m) => m.studentKey),
  );
  const toRemove = bookings.filter(
    (b) => !present.has(studentKeyOf(b.purchaseItem.purchase)),
  );
  if (toRemove.length === 0) {
    return { success: true, msg: "Alla bokningar har närvaro." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const booking of toRemove) {
        const clipResult = await handleClips(tx, booking.purchaseItemId, 1);
        if (!clipResult.success) {
          throw new Error(clipResult.msg || "Kunde inte återställa saldo.");
        }
        await tx.booking.delete({ where: { id: booking.id } });
      }
    });
  } catch (e) {
    console.error("Kunde inte ta bort bokningar utan närvaro", e);
    return { success: false, msg: "Kunde inte ta bort bokningarna." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/lectures");
  revalidatePath("/admin/students");
  revalidatePath("/user");

  return {
    success: true,
    msg: `${toRemove.length} ${
      toRemove.length === 1 ? "bokning" : "bokningar"
    } utan närvaro togs bort och tillfällena lades tillbaka.`,
  };
}

export type MyAttendance = {
  id: string;
  lessonId: string;
  startTime: Date;
  endTime: Date;
  courseName: { sv: string; en: string };
  /** Null när det är kunden själv. */
  participantName: string | null;
  status: AttendanceStatus;
};

/**
 * Kundens egen närvaro och deltagarnas, för profilsidan.
 *
 * Hämtas ur närvaroregistret och inte via bokningarna: en elev kan vara
 * markerad utan bokning, och en bokning utan markering betyder bara att
 * läraren inte tagit närvaro — det är inte samma sak som frånvaro.
 */
export async function getMyAttendance(): Promise<MyAttendance[]> {
  const session = await getSessionData();
  if (!session) return [];

  const marks = await prisma.attendance.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        { participant: { userId: session.user.id } },
        { participant: { addedByUserId: session.user.id } },
      ],
    },
    orderBy: { lesson: { startTime: "desc" } },
    select: {
      id: true,
      status: true,
      participant: { select: { name: true, userId: true } },
      lesson: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          course: {
            select: {
              name: true,
              name_en: true,
              minAge: true,
              maxAge: true,
              adult: true,
              level: true,
              level_en: true,
            },
          },
        },
      },
    },
  });

  return marks.map((m) => ({
    id: m.id,
    lessonId: m.lesson.id,
    startTime: m.lesson.startTime,
    endTime: m.lesson.endTime,
    courseName: {
      sv: getCourseName(m.lesson.course, "sv"),
      en: getCourseName(m.lesson.course, "en"),
    },
    participantName:
      m.participant && m.participant.userId !== session.user.id
        ? m.participant.name
        : null,
    status: m.status,
  }));
}
