// Dataunderlag för adminpanelens översiktssida. Ligger medvetet utanför en
// "use server"-fil: varje export i en sådan blir en publik endpoint, och det
// här är rena läsfrågor som bara ska nås från /admin, som redan har vaktat
// rollen. Funktionerna gör alltså ingen egen behörighetskontroll — anropa dem
// aldrig från något som inte redan vet vem användaren är.

import type { Prisma } from "@/generated/prisma/client";
import prisma from "./prisma";

export type LessonWithData = Prisma.LessonGetPayload<{
  include: {
    bookings: true;
    course: true;
    teacher: true;
    schemaItem: { include: { studio: true } };
  };
}>;

const lessonInclude = {
  bookings: true,
  course: true,
  teacher: true,
  schemaItem: { include: { studio: true } },
} satisfies Prisma.LessonInclude;

/** Karusellen visar en månad bakåt och en framåt. */
const CAROUSEL_DAYS = 31;
/** Nyckeltalen tittar en vecka framåt — det är planeringshorisonten. */
const AHEAD_DAYS = 7;

const days = (n: number) => n * 24 * 60 * 60 * 1000;

/** Antal faktiska deltagare på en lektion, alltså exklusive avbokade. */
export function bookedCount(lesson: LessonWithData): number {
  return lesson.bookings.filter((booking) => !booking.cancelled).length;
}

export type OverviewStats = {
  lessonsAhead: number;
  bookingsAhead: number;
  /** Bara för admin — lärare får 0, frågan körs aldrig för dem. */
  ordersLastWeek: number;
  /** Utestående belopp i öre. Bara för admin, av samma skäl. */
  unpaidTotal: number;
};

export type PendingActions = {
  awaitingApproval: number;
  unpaid: number;
};

export type OwnLessons = {
  lessons: LessonWithData[];
  initialScrollIndex: number;
};

/**
 * Lektionerna som ligger på ett visst dygn, i Stockholmstid.
 * Utan teacherId gäller det hela skolan.
 */
async function getLessonsOnDay(
  dayStart: Date,
  dayEnd: Date,
  teacherId?: string,
): Promise<LessonWithData[]> {
  return prisma.lesson.findMany({
    where: {
      startTime: { gte: dayStart, lte: dayEnd },
      ...(teacherId ? { teacherId } : {}),
    },
    include: lessonInclude,
    orderBy: { startTime: "asc" },
  });
}

/**
 * Inställda lektioner framåt — det kunderna ser som inställt just nu.
 */
async function getCancelledAhead(
  now: Date,
  teacherId?: string,
): Promise<LessonWithData[]> {
  return prisma.lesson.findMany({
    where: {
      cancelled: true,
      startTime: {
        gte: now,
        lte: new Date(now.getTime() + days(CAROUSEL_DAYS)),
      },
      ...(teacherId ? { teacherId } : {}),
    },
    include: lessonInclude,
    orderBy: { startTime: "asc" },
    take: 5,
  });
}

/**
 * Egna lektioner en månad bakåt och framåt, plus vilket kort karusellen ska
 * öppna på: första som inte redan är avslutad, annars det sista.
 */
export async function getOwnLessons(userId: string): Promise<OwnLessons> {
  const now = new Date();

  const lessons = await prisma.lesson.findMany({
    where: {
      teacherId: userId,
      startTime: {
        gte: new Date(now.getTime() - days(CAROUSEL_DAYS)),
        lte: new Date(now.getTime() + days(CAROUSEL_DAYS)),
      },
    },
    include: lessonInclude,
    orderBy: { startTime: "asc" },
  });

  const firstUpcoming = lessons.findIndex(
    (lesson) => new Date(lesson.endTime) >= now,
  );

  const initialScrollIndex =
    firstUpcoming !== -1
      ? firstUpcoming
      : lessons.length > 0
        ? lessons.length - 1
        : 0;

  return { lessons, initialScrollIndex };
}

/**
 * Nyckeltal för kommande vecka. Utan teacherId gäller de hela skolan.
 */
async function getStats(now: Date, teacherId?: string): Promise<OverviewStats> {
  const aheadEnd = new Date(now.getTime() + days(AHEAD_DAYS));
  const lastWeek = new Date(now.getTime() - days(AHEAD_DAYS));
  const teacherScope = teacherId ? { teacherId } : {};

  const [lessonsAhead, bookingsAhead, ordersLastWeek, unpaidAggregate] =
    await Promise.all([
      prisma.lesson.count({
        where: {
          cancelled: false,
          startTime: { gte: now, lte: aheadEnd },
          ...teacherScope,
        },
      }),
      prisma.booking.count({
        where: {
          cancelled: false,
          lesson: {
            cancelled: false,
            startTime: { gte: now, lte: aheadEnd },
            ...teacherScope,
          },
        },
      }),
      // Ordrar är inget lärare har med att göra, så den frågan hoppas över
      // helt för dem i stället för att bara döljas i UI:t.
      teacherId
        ? Promise.resolve(0)
        : prisma.order.count({ where: { createdAt: { gte: lastWeek } } }),
      teacherId
        ? Promise.resolve(null)
        : prisma.order.aggregate({
            where: { isPaid: false, status: { not: "CANCELLED" } },
            _sum: { totalPrice: true },
          }),
    ]);

  return {
    lessonsAhead,
    bookingsAhead,
    ordersLastWeek,
    unpaidTotal: unpaidAggregate?._sum.totalPrice ?? 0,
  };
}

export type AdminOverview = {
  today: LessonWithData[];
  cancelledAhead: LessonWithData[];
  stats: OverviewStats;
  actions: PendingActions;
  own: OwnLessons;
};

export async function getAdminOverview(
  userId: string,
  dayStart: Date,
  dayEnd: Date,
): Promise<AdminOverview> {
  const now = new Date();

  const [today, cancelledAhead, stats, awaitingApproval, unpaid, own] =
    await Promise.all([
      getLessonsOnDay(dayStart, dayEnd),
      getCancelledAhead(now),
      getStats(now),
      // Motsvarar exakt det "Väntar"-filtret på /admin/orders visar, så
      // siffran här stämmer med listan man klickar sig till.
      prisma.order.count({ where: { status: "AWAITING_APPROVAL" } }),
      prisma.order.count({
        where: { isPaid: false, status: { not: "CANCELLED" } },
      }),
      getOwnLessons(userId),
    ]);

  return {
    today,
    cancelledAhead,
    stats,
    actions: { awaitingApproval, unpaid },
    own,
  };
}

export type TeacherOverview = {
  today: LessonWithData[];
  cancelledAhead: LessonWithData[];
  stats: OverviewStats;
  own: OwnLessons;
};

export async function getTeacherOverview(
  userId: string,
  dayStart: Date,
  dayEnd: Date,
): Promise<TeacherOverview> {
  const now = new Date();

  const [today, cancelledAhead, stats, own] = await Promise.all([
    getLessonsOnDay(dayStart, dayEnd, userId),
    getCancelledAhead(now, userId),
    getStats(now, userId),
    getOwnLessons(userId),
  ]);

  return { today, cancelledAhead, stats, own };
}
