// Dataunderlag för adminpanelens översiktssida. Ligger medvetet utanför en
// "use server"-fil: varje export i en sådan blir en publik endpoint, och det
// här är rena läsfrågor som bara ska nås från /admin, som redan har vaktat
// rollen. Funktionerna gör alltså ingen egen behörighetskontroll — anropa dem
// aldrig från något som inte redan vet vem användaren är.

import type { Prisma } from "@/generated/prisma/client";
import { studentKeyOf } from "./course-roster";
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

/** Hur långt bakåt översikten letar efter lektioner att stämma av. */
const FOLLOW_UP_DAYS = 7;

export type AttendanceFollowUp = {
  lesson: LessonWithData;
  /** Lektionen har bokningar men ingen markering alls. */
  notTaken: boolean;
  /** Bokade som inte markerats närvarande. Bara när närvaron är tagen. */
  bookedNotPresent: number;
  /** Markerade närvarande utan bokning på lektionen. */
  presentNotBooked: number;
};

/**
 * Lektioner den senaste veckan där bokningarna och närvaron inte stämmer.
 *
 * Närvaron och bokningarna är skilda register och rör aldrig varandra av sig
 * själva, så det är här studion fångar det som behöver följas upp: en lärare
 * som inte tagit närvaro, en elev som bokat men inte kom (bokningen kan tas
 * bort och klippet lämnas tillbaka), eller en elev som kom utan att ha bokat
 * (bokas in i efterhand, eller går utan köp).
 *
 * Bara avslutade, ej inställda lektioner. En vecka bakåt räcker för att
 * hinna följa upp, utan att listan växer med allt som aldrig stämts av.
 * Utan teacherId gäller det hela skolan; med, lärarens egna lektioner.
 */
export async function getAttendanceFollowUp(
  now: Date,
  teacherId?: string,
): Promise<AttendanceFollowUp[]> {
  const lessons = await prisma.lesson.findMany({
    where: {
      cancelled: false,
      endTime: { lt: now, gte: new Date(now.getTime() - days(FOLLOW_UP_DAYS)) },
      ...(teacherId ? { OR: [{ teacherId }, { course: { teacherId } }] } : {}),
    },
    include: {
      ...lessonInclude,
      bookings: {
        include: {
          purchaseItem: {
            select: {
              purchase: { select: { userId: true, participantId: true } },
            },
          },
        },
      },
      attendance: { select: { studentKey: true, status: true } },
    },
    orderBy: { startTime: "desc" },
  });

  const result: AttendanceFollowUp[] = [];

  for (const lesson of lessons) {
    const active = lesson.bookings.filter((b) => !b.cancelled);
    const marks = new Map(
      lesson.attendance.map((m) => [m.studentKey, m.status]),
    );
    const bookedKeys = new Set(
      active.map((b) => studentKeyOf(b.purchaseItem.purchase)),
    );

    const taken = marks.size > 0;
    const notTaken = !taken && active.length > 0;
    const bookedNotPresent = taken
      ? [...bookedKeys].filter((key) => marks.get(key) !== "PRESENT").length
      : 0;
    const presentNotBooked = lesson.attendance.filter(
      (m) => m.status === "PRESENT" && !bookedKeys.has(m.studentKey),
    ).length;

    if (notTaken || bookedNotPresent > 0 || presentNotBooked > 0) {
      const { attendance: _attendance, ...rest } = lesson;
      result.push({
        lesson: rest,
        notTaken,
        bookedNotPresent,
        presentNotBooked,
      });
    }
  }

  return result;
}

export type AdminOverview = {
  today: LessonWithData[];
  cancelledAhead: LessonWithData[];
  followUp: AttendanceFollowUp[];
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

  const [
    today,
    cancelledAhead,
    followUp,
    stats,
    awaitingApproval,
    unpaid,
    own,
  ] = await Promise.all([
    getLessonsOnDay(dayStart, dayEnd),
    getCancelledAhead(now),
    getAttendanceFollowUp(now),
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
    followUp,
    stats,
    actions: { awaitingApproval, unpaid },
    own,
  };
}

export type TeacherOverview = {
  today: LessonWithData[];
  cancelledAhead: LessonWithData[];
  followUp: AttendanceFollowUp[];
  stats: OverviewStats;
  own: OwnLessons;
};

export async function getTeacherOverview(
  userId: string,
  dayStart: Date,
  dayEnd: Date,
): Promise<TeacherOverview> {
  const now = new Date();

  const [today, cancelledAhead, followUp, stats, own] = await Promise.all([
    getLessonsOnDay(dayStart, dayEnd, userId),
    getCancelledAhead(now, userId),
    getAttendanceFollowUp(now, userId),
    getStats(now, userId),
    getOwnLessons(userId),
  ]);

  return { today, cancelledAhead, followUp, stats, own };
}
