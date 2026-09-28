import { studentKeyOf } from "./course-roster";
import { startOfStockholmDay } from "./date-utils";
import prisma from "./prisma";

/**
 * Hur närvaron på en lektion stämmer mot bokningarna.
 *
 * Närvaron och bokningarna är skilda register som aldrig rör varandra av sig
 * själva. Den här jämförelsen är den enda regeln för när de säger samma sak,
 * så att översiktens "Stäm av närvaro" och närvarokalenderns färger inte kan
 * säga olika.
 */
export type LessonComparison = {
  /** Någon på lektionen har markerats. */
  taken: boolean;
  /** Det finns bokningar men ingen markering alls. */
  notTaken: boolean;
  /** Bokade som inte markerats närvarande. Bara när närvaron är tagen. */
  bookedNotPresent: number;
  /** Markerade närvarande utan bokning på lektionen. */
  presentNotBooked: number;
  /** Närvaron är tagen och stämmer inte med bokningarna. */
  mismatch: boolean;
};

export function compareLesson(lesson: {
  bookings: {
    cancelled: boolean;
    purchaseItem: {
      purchase: { userId: string; participantId: string | null };
    };
  }[];
  attendance: { studentKey: string; status: "PRESENT" | "ABSENT" }[];
}): LessonComparison {
  const active = lesson.bookings.filter((b) => !b.cancelled);
  const marks = new Map(lesson.attendance.map((m) => [m.studentKey, m.status]));
  const bookedKeys = new Set(
    active.map((b) => studentKeyOf(b.purchaseItem.purchase)),
  );

  const taken = marks.size > 0;
  const bookedNotPresent = taken
    ? [...bookedKeys].filter((key) => marks.get(key) !== "PRESENT").length
    : 0;
  const presentNotBooked = lesson.attendance.filter(
    (m) => m.status === "PRESENT" && !bookedKeys.has(m.studentKey),
  ).length;

  return {
    taken,
    notTaken: !taken && active.length > 0,
    bookedNotPresent,
    presentNotBooked,
    mismatch: bookedNotPresent > 0 || presentNotBooked > 0,
  };
}

/** Det bokningarna och markeringarna behöver hämtas med för jämförelsen. */
export const compareLessonInclude = {
  bookings: {
    select: {
      cancelled: true,
      purchaseItem: {
        select: {
          purchase: { select: { userId: true, participantId: true } },
        },
      },
    },
  },
  attendance: { select: { studentKey: true, status: true } },
} as const;

/**
 * Dagen närvaro togs första gången, i Stockholmstid. Lektioner före den
 * räknas aldrig som saknad närvaro: då fanns inget sätt att ta den, och hela
 * terminen fram till lanseringen skulle annars lysa rött.
 *
 * Null när ingen närvaro tagits ännu — då påminns inte om någonting.
 */
export async function attendanceStartedAt(): Promise<Date | null> {
  const first = await prisma.attendance.aggregate({
    _min: { createdAt: true },
  });
  const at = first._min.createdAt;
  return at ? startOfStockholmDay(at) : null;
}
