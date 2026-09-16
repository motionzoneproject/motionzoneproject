"use server";

import { revalidatePath } from "next/cache";
import { getCourseRoster, type RosterStudent } from "@/lib/course-roster";
import prisma from "../prisma";
import { getSessionData } from "./sessiondata";

type Result = { success: boolean; msg: string };

export type RosterView = {
  courseId: string;
  courseName: string;
  students: RosterStudent[];
  /** Elever som studion dolt, så de går att ta tillbaka. */
  hidden: { studentKey: string; name: string; note: string | null }[];
};

export type RosterCandidate = {
  studentKey: string;
  name: string;
  detail: string;
};

function parseStudentKey(studentKey: string) {
  const [kind, id] = studentKey.split(":");
  if (kind === "participant" && id) return { participantId: id, userId: null };
  if (kind === "user" && id) return { participantId: null, userId: id };
  return null;
}

async function mayManageCourse(courseId: string) {
  const session = await getSessionData();
  if (!session) return null;
  if (session.user.role === "admin") return session;

  if (session.user.role === "teacher") {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true },
    });
    if (course?.teacherId === session.user.id) return session;
  }

  return null;
}

/**
 * Kursens elevlista med studions egna justeringar.
 *
 * @auth Admin eller kursens lärare
 */
export async function getRosterForCourse(
  courseId: string,
): Promise<RosterView | null> {
  if (!(await mayManageCourse(courseId))) return null;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, name: true },
  });
  if (!course) return null;

  const [students, hiddenEntries] = await Promise.all([
    getCourseRoster(courseId),
    prisma.courseRosterEntry.findMany({
      where: { courseId, status: "HIDDEN" },
      select: {
        studentKey: true,
        note: true,
        user: { select: { name: true } },
        participant: { select: { name: true } },
      },
    }),
  ]);

  return {
    courseId: course.id,
    courseName: course.name,
    students,
    hidden: hiddenEntries.map((entry) => ({
      studentKey: entry.studentKey,
      name: entry.participant?.name ?? entry.user?.name ?? entry.studentKey,
      note: entry.note,
    })),
  };
}

/**
 * Lägger till en elev i kursens lista utan att röra köpen.
 *
 * För en elev vars köp inte gav några kursrader — ett program vars kurser
 * kopplades efter köpet, till exempel — är det här vägen in i listan. Eleven
 * får ingen bokning och inget klipp dras: listan säger vilka som går kursen,
 * inte vad de betalat för.
 *
 * @auth Admin eller kursens lärare
 */
export async function addStudentToCourse(
  courseId: string,
  studentKey: string,
  note?: string,
): Promise<Result> {
  const session = await mayManageCourse(courseId);
  if (!session) return { success: false, msg: "Ingen behörighet." };

  const parsed = parseStudentKey(studentKey);
  if (!parsed) return { success: false, msg: "Ogiltig elev." };

  // Eleven måste finnas. Annars skulle en manipulerad nyckel kunna lägga in
  // rader som pekar på ingenting.
  const exists = parsed.participantId
    ? await prisma.participant.findUnique({
        where: { id: parsed.participantId },
        select: { id: true },
      })
    : await prisma.user.findUnique({
        where: { id: parsed.userId ?? "" },
        select: { id: true },
      });
  if (!exists) return { success: false, msg: "Eleven hittades inte." };

  await prisma.courseRosterEntry.upsert({
    where: { courseId_studentKey: { courseId, studentKey } },
    update: {
      status: "ADDED",
      note: note ?? null,
      addedByUserId: session.user.id,
    },
    create: {
      courseId,
      studentKey,
      userId: parsed.userId,
      participantId: parsed.participantId,
      status: "ADDED",
      note: note ?? null,
      addedByUserId: session.user.id,
    },
  });

  revalidatePath("/admin/attendance");
  revalidatePath("/admin/students");

  return { success: true, msg: "Eleven är tillagd i listan." };
}

/**
 * Döljer en elev ur kursens lista.
 *
 * Ett terminskort ger kursrader i samtliga kurser det gäller, så köparen dyker
 * upp i listor hen aldrig går på. Att dölja raden rör varken köpet, saldot
 * eller bokningarna — bara vem läraren ser på lektionen.
 *
 * @auth Admin eller kursens lärare
 */
export async function hideStudentFromCourse(
  courseId: string,
  studentKey: string,
  note?: string,
): Promise<Result> {
  const session = await mayManageCourse(courseId);
  if (!session) return { success: false, msg: "Ingen behörighet." };

  const parsed = parseStudentKey(studentKey);
  if (!parsed) return { success: false, msg: "Ogiltig elev." };

  await prisma.courseRosterEntry.upsert({
    where: { courseId_studentKey: { courseId, studentKey } },
    update: {
      status: "HIDDEN",
      note: note ?? null,
      addedByUserId: session.user.id,
    },
    create: {
      courseId,
      studentKey,
      userId: parsed.userId,
      participantId: parsed.participantId,
      status: "HIDDEN",
      note: note ?? null,
      addedByUserId: session.user.id,
    },
  });

  revalidatePath("/admin/attendance");
  revalidatePath("/admin/students");

  return { success: true, msg: "Eleven är borttagen ur listan." };
}

/**
 * Tar bort studions justering, så listan åter följer köpen.
 *
 * @auth Admin eller kursens lärare
 */
export async function clearRosterAdjustment(
  courseId: string,
  studentKey: string,
): Promise<Result> {
  if (!(await mayManageCourse(courseId))) {
    return { success: false, msg: "Ingen behörighet." };
  }

  await prisma.courseRosterEntry.deleteMany({
    where: { courseId, studentKey },
  });

  revalidatePath("/admin/attendance");
  revalidatePath("/admin/students");

  return { success: true, msg: "Justeringen är borttagen." };
}

/**
 * Söker elever att lägga till i en kurs, bland deltagare och konton.
 *
 * @auth Admin eller kursens lärare
 */
export async function searchStudentsForRoster(
  courseId: string,
  query: string,
): Promise<RosterCandidate[]> {
  if (!(await mayManageCourse(courseId))) return [];

  const term = query.trim();
  if (term.length < 2) return [];

  const [participants, users] = await Promise.all([
    prisma.participant.findMany({
      where: { name: { contains: term, mode: "insensitive" } },
      select: {
        id: true,
        name: true,
        email: true,
        addedBy: { select: { name: true } },
      },
      take: 10,
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true },
      take: 10,
    }),
  ]);

  const existing = new Set(
    (await getCourseRoster(courseId)).map((s) => s.studentKey),
  );

  const candidates: RosterCandidate[] = [
    ...participants.map((p) => ({
      studentKey: `participant:${p.id}`,
      name: p.name,
      detail: `Deltagare · kund: ${p.addedBy.name}${p.email ? ` · ${p.email}` : ""}`,
    })),
    ...users.map((u) => ({
      studentKey: `user:${u.id}`,
      name: u.name,
      detail: `Konto · ${u.email}`,
    })),
  ];

  return candidates.filter((c) => !existing.has(c.studentKey));
}
