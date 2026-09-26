"use server";

import { revalidatePath } from "next/cache";
import { handleClips } from "@/lib/clips";
import { mayManageCourse } from "@/lib/course-access";
import { studentKeyOf } from "@/lib/course-roster";
import {
  type LoadedCourseRoster,
  loadCourseRoster,
  type RosterStudent,
} from "@/lib/course-roster-data";
import prisma from "../prisma";
import { autobook } from "./server-actions";
import { getSessionData } from "./sessiondata";

type Result = { success: boolean; msg: string };

export type RosterCandidate = {
  studentKey: string;
  name: string;
  detail: string;
  /**
   * Har ett köp som gäller kursen. Utan köp läggs eleven till för hand, och
   * det ska admin få veta innan: då finns ingen order och ingen faktura.
   */
  hasPurchase: boolean;
};

type ParsedKey =
  | { kind: "participant"; participantId: string }
  | { kind: "user"; userId: string };

function parseStudentKey(key: string): ParsedKey | null {
  const [kind, id] = key.split(":");
  if (!id) return null;
  if (kind === "participant") return { kind, participantId: id };
  if (kind === "user") return { kind, userId: id };
  return null;
}

/** Elevens kursrader för kursen: köpen där hen är deltagare, eller ägare. */
function courseItemsWhere(courseId: string, key: ParsedKey) {
  return {
    courseId,
    purchase:
      key.kind === "participant"
        ? { participantId: key.participantId }
        : { userId: key.userId, participantId: null },
  };
}

async function studentName(key: ParsedKey): Promise<string | null> {
  if (key.kind === "participant") {
    const p = await prisma.participant.findUnique({
      where: { id: key.participantId },
      select: { name: true },
    });
    return p?.name ?? null;
  }

  const u = await prisma.user.findUnique({
    where: { id: key.userId },
    select: { name: true },
  });
  return u?.name ?? null;
}

function revalidateRosterViews() {
  revalidatePath("/admin/students");
  revalidatePath("/admin/courses");
  revalidatePath("/admin/lectures");
  revalidatePath("/user");
}

/**
 * Tar bort en elev från en kurs.
 *
 * Kommande bokningar i kursen tas bort och saldot återställs, så att
 * lektionernas listor och kurslistan säger samma sak. Lektioner som redan
 * varit rörs inte — de är historik, och gamla bokningar skulle annars hålla
 * kvar eleven i listan. Därför sparas också ett uttryckligt "borttagen", som
 * vinner över köpen och bokningarna.
 *
 * Var eleven bara manuellt tillagd tas den raden bort i stället.
 *
 * @auth Admin eller kursens lärare
 */
export async function removeStudentFromCourse(
  courseId: string,
  studentKey: string,
): Promise<Result> {
  if (!(await mayManageCourse(courseId)))
    return { success: false, msg: "Ingen behörighet." };

  const session = await getSessionData();
  const key = parseStudentKey(studentKey);
  if (!session || !key) return { success: false, msg: "Okänd elev." };

  const name = await studentName(key);
  if (!name) return { success: false, msg: "Eleven hittades inte." };

  const existing = await prisma.courseRosterEntry.findUnique({
    where: { courseId_studentKey: { courseId, studentKey } },
    select: { id: true, status: true },
  });

  if (existing?.status === "ADDED") {
    await prisma.courseRosterEntry.delete({ where: { id: existing.id } });
    revalidateRosterViews();
    return { success: true, msg: `${name} är inte längre tillagd i kursen.` };
  }

  const now = new Date();
  const items = await prisma.purchaseItem.findMany({
    where: courseItemsWhere(courseId, key),
    select: {
      id: true,
      bookings: {
        where: { lesson: { startTime: { gte: now } } },
        select: { id: true },
      },
    },
  });

  const cancelled = items.reduce((sum, i) => sum + i.bookings.length, 0);

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (item.bookings.length === 0) continue;

        const clipResult = await handleClips(tx, item.id, item.bookings.length);
        if (!clipResult.success)
          throw new Error(clipResult.msg || "Kunde inte återställa saldo.");

        await tx.booking.deleteMany({
          where: { id: { in: item.bookings.map((b) => b.id) } },
        });
      }

      await tx.courseRosterEntry.upsert({
        where: { courseId_studentKey: { courseId, studentKey } },
        update: { status: "REMOVED", changedByUserId: session.user.id },
        create: {
          courseId,
          studentKey,
          userId: key.kind === "user" ? key.userId : null,
          participantId: key.kind === "participant" ? key.participantId : null,
          status: "REMOVED",
          changedByUserId: session.user.id,
        },
      });
    });
  } catch (e) {
    console.error("removeStudentFromCourse misslyckades", e);
    return { success: false, msg: "Kunde inte ta bort eleven från kursen." };
  }

  revalidateRosterViews();

  return {
    success: true,
    msg:
      cancelled > 0
        ? `${name} är borttagen från kursen. ${cancelled} kommande bokningar togs bort och saldot återställdes.`
        : `${name} är borttagen från kursen.`,
  };
}

/**
 * Lägger till en elev i en kurs.
 *
 * Har eleven ett köp som gäller kursen bokas hen in på kursens kommande
 * lektioner, precis som schemadialogen gör — då behövs ingen särskild rad,
 * bokningarna placerar eleven. Saknas köp (provlektion, kontant betalning)
 * sparas eleven som manuellt tillagd, utan saldo och utan fakturering.
 *
 * En tidigare borttagning tas alltid bort först.
 *
 * @auth Admin eller kursens lärare
 */
export async function addStudentToCourse(
  courseId: string,
  studentKey: string,
): Promise<Result> {
  if (!(await mayManageCourse(courseId)))
    return { success: false, msg: "Ingen behörighet." };

  const session = await getSessionData();
  const key = parseStudentKey(studentKey);
  if (!session || !key) return { success: false, msg: "Okänd elev." };

  const name = await studentName(key);
  if (!name) return { success: false, msg: "Eleven hittades inte." };

  await prisma.courseRosterEntry.deleteMany({
    where: { courseId, studentKey, status: "REMOVED" },
  });

  const items = await prisma.purchaseItem.findMany({
    where: courseItemsWhere(courseId, key),
    select: { id: true },
  });

  let booked = 0;
  for (const item of items) {
    const created = await autobook(item.id, undefined, { explicit: true });
    booked += created.length;
    if (created.length > 0) break;
  }

  if (booked > 0) {
    revalidateRosterViews();
    return {
      success: true,
      msg: `${name} är inbokad på ${booked} kommande lektioner i kursen.`,
    };
  }

  // Inget köp, eller inget kvar att boka med: eleven läggs till för hand.
  await prisma.courseRosterEntry.upsert({
    where: { courseId_studentKey: { courseId, studentKey } },
    update: { status: "ADDED", changedByUserId: session.user.id },
    create: {
      courseId,
      studentKey,
      userId: key.kind === "user" ? key.userId : null,
      participantId: key.kind === "participant" ? key.participantId : null,
      status: "ADDED",
      changedByUserId: session.user.id,
    },
  });

  revalidateRosterViews();

  // Varför inget bokades: bara admin får boka på någon annans köp, så en
  // lärare lägger alltid till för hand. För admin är saldot slut, eller så
  // saknar kursen kommande lektioner.
  const msg =
    items.length === 0
      ? `${name} är tillagd i kursen utan köp — ingen bokning och inget saldo.`
      : session.user.role !== "admin"
        ? `${name} är tillagd i kursen. Bokningar på elevens köp görs av admin.`
        : `${name} är tillagd i kursen, men inga lektioner bokades — saldot är slut eller så saknar kursen kommande lektioner.`;

  return { success: true, msg };
}

export type CourseRosterStudent = RosterStudent;
export type CourseRoster = LoadedCourseRoster;

/**
 * Vem som går en kurs, för "Hantera elever". Listan byggs i
 * course-roster-data, som även närvaron använder.
 *
 * @auth Admin eller kursens lärare
 */
export async function getCourseRoster(
  courseId: string,
): Promise<CourseRoster | null> {
  if (!(await mayManageCourse(courseId))) return null;
  return loadCourseRoster(courseId);
}

/**
 * Söker elever att lägga till i en kurs, bland deltagare och konton.
 *
 * @auth Admin eller kursens lärare
 */
export async function searchStudentsForCourse(
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

  const items = await prisma.purchaseItem.findMany({
    where: {
      courseId,
      OR: [
        { purchase: { participantId: { in: participants.map((p) => p.id) } } },
        {
          purchase: {
            participantId: null,
            userId: { in: users.map((u) => u.id) },
          },
        },
      ],
    },
    select: { purchase: { select: { userId: true, participantId: true } } },
  });
  const withPurchase = new Set(items.map((i) => studentKeyOf(i.purchase)));

  return [
    ...participants.map((p) => ({
      studentKey: `participant:${p.id}`,
      name: p.name,
      detail: `Deltagare · kund: ${p.addedBy.name}${p.email ? ` · ${p.email}` : ""}`,
      hasPurchase: withPurchase.has(`participant:${p.id}`),
    })),
    ...users.map((u) => ({
      studentKey: `user:${u.id}`,
      name: u.name,
      detail: `Konto · ${u.email}`,
      hasPurchase: withPurchase.has(`user:${u.id}`),
    })),
  ];
}
