// Hjälpare för testerna av elevlistor, schemadialog och autobokning.

import prisma from "@/lib/prisma";
import { actAs } from "./session";

type Who = { id: string; role?: string | null };

export function asAdmin(admin: Who) {
  actAs({ id: admin.id, role: "admin" });
}

export function asTeacher(teacher: Who) {
  actAs({ id: teacher.id, role: "teacher" });
}

/** Loggar in med användarens roll som den står i databasen. */
export function asUser(user: Who) {
  actAs({ id: user.id, role: user.role ?? "user" });
}

export function userKey(user: { id: string }) {
  return `user:${user.id}`;
}

export function participantKey(participant: { id: string }) {
  return `participant:${participant.id}`;
}

export async function rosterEntry(courseId: string, studentKey: string) {
  return prisma.courseRosterEntry.findUnique({
    where: { courseId_studentKey: { courseId, studentKey } },
  });
}

/** Saldot på en kursrad (COURSE/PACK). */
export async function itemRemaining(purchaseItemId: string) {
  const item = await prisma.purchaseItem.findUniqueOrThrow({
    where: { id: purchaseItemId },
    select: { remainingCount: true },
  });
  return item.remainingCount;
}

/** Klippkortets gemensamma saldo. */
export async function clipRemaining(purchaseId: string) {
  const p = await prisma.purchase.findUniqueOrThrow({
    where: { id: purchaseId },
    select: { remainingCount: true },
  });
  return p.remainingCount;
}

export async function bookingCount(purchaseItemId: string) {
  return prisma.booking.count({ where: { purchaseItemId } });
}

/** Kursens lektioner, äldst först. */
export async function lessonsOf(courseId: string) {
  return prisma.lesson.findMany({
    where: { courseId },
    orderBy: { startTime: "asc" },
  });
}

/**
 * Bokar eleven på kursens passerade lektioner direkt i databasen — närvaro
 * från tidigare i terminen — och drar saldot som en bokning gör.
 */
export async function bookPastLessons(item: {
  id: string;
  courseId: string;
  purchaseId: string;
}) {
  const purchase = await prisma.purchase.findUniqueOrThrow({
    where: { id: item.purchaseId },
    select: { userId: true },
  });
  const past = await prisma.lesson.findMany({
    where: { courseId: item.courseId, startTime: { lt: new Date() } },
  });
  for (const lesson of past) {
    await prisma.booking.create({
      data: {
        lessonId: lesson.id,
        purchaseItemId: item.id,
        userId: purchase.userId,
      },
    });
  }
  await prisma.purchaseItem.update({
    where: { id: item.id },
    data: { remainingCount: { decrement: past.length } },
  });
  return past.length;
}

/** Köpets kursrad för en viss kurs. */
export function itemFor<T extends { courseId: string }>(
  items: T[],
  course: { id: string },
): T {
  const item = items.find((i) => i.courseId === course.id);
  if (!item) throw new Error(`Ingen kursrad för kurs ${course.id}`);
  return item;
}
