import { calcRemainingCount, showRemaining } from "./actions/purchase-helpers";
import prisma from "./prisma";

/** Nyckeln som resten av adminkoden identifierar en elev med. */
export function studentKeyOf(input: {
  participantId?: string | null;
  userId: string;
}): string {
  return input.participantId
    ? `participant:${input.participantId}`
    : `user:${input.userId}`;
}

export type RosterStudent = {
  studentKey: string;
  userId: string | null;
  participantId: string | null;
  name: string;
  /** Kontoinnehavaren, när eleven är en deltagare någon annan lagt till. */
  customerName: string | null;
  /** Varifrån eleven kommer: ett köp, eller tillagd för hand. */
  source: "purchase" | "manual";
  /** Saldo på kursen. "∞" för obegränsat, null när eleven saknar köp. */
  remaining: string | null;
  /** Sant när eleven är inbokad på just den lektionen. */
  booked: boolean;
};

/**
 * Elevlistan för en kurs.
 *
 * Grunden är köpen: alla som har en kursrad för kursen. Ovanpå det ligger
 * studions egna justeringar — dolda rader plockas bort, manuellt tillagda
 * elever läggs till. Justeringarna rör aldrig köp, ordrar eller fakturor.
 */
export async function getCourseRoster(
  courseId: string,
  lessonId?: string,
): Promise<RosterStudent[]> {
  const [purchaseItems, adjustments, bookings] = await Promise.all([
    prisma.purchaseItem.findMany({
      where: { courseId },
      select: {
        id: true,
        remainingCount: true,
        unlimited: true,
        purchase: {
          select: {
            type: true,
            remainingCount: true,
            product: { select: { autobook: true } },
            // Hur många kurser köpet spänner över. Ett terminskort ger rader
            // i samtliga, och då säger köpet ingenting om vilken eleven går.
            _count: { select: { PurchaseItems: true } },
            user: { select: { id: true, name: true } },
            participant: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.courseRosterEntry.findMany({
      where: { courseId },
      select: {
        studentKey: true,
        status: true,
        userId: true,
        participantId: true,
        user: { select: { id: true, name: true } },
        participant: {
          select: {
            id: true,
            name: true,
            addedBy: { select: { name: true } },
          },
        },
      },
    }),
    // Bokningar i hela kursen. För köp som spänner över många kurser är
    // bokningen beskedet om vilka eleven faktiskt går på.
    prisma.booking.findMany({
      where: { cancelled: false, lesson: { courseId } },
      select: {
        lessonId: true,
        purchaseItem: {
          select: {
            purchase: { select: { userId: true, participantId: true } },
          },
        },
      },
    }),
  ]);

  const keyOfBooking = (b: (typeof bookings)[number]) =>
    studentKeyOf({
      participantId: b.purchaseItem.purchase.participantId,
      userId: b.purchaseItem.purchase.userId,
    });

  const bookedInCourse = new Set(bookings.map(keyOfBooking));

  // Utan lektion (kurslistan i "Hantera elever") räknas hela kursen.
  const bookedHere = lessonId
    ? new Set(bookings.filter((b) => b.lessonId === lessonId).map(keyOfBooking))
    : bookedInCourse;

  const hidden = new Set(
    adjustments.filter((a) => a.status === "HIDDEN").map((a) => a.studentKey),
  );

  const students = new Map<string, RosterStudent>();

  for (const item of purchaseItems) {
    const { user, participant } = item.purchase;
    const key = studentKeyOf({
      participantId: participant?.id,
      userId: user.id,
    });
    if (hidden.has(key)) continue;

    // Ett köp som täcker flera kurser utan att boka in eleven säger bara vad
    // hen får gå på, inte vad hen går. Ett terminskort ger rader i tjugotal
    // kurser, och att lista köparen i allihop är just det som gjorde
    // närvarolistorna oanvändbara. För dem är bokningen beskedet.
    //
    // Autobokande produkter är undantaget: där ska eleven ha en bokning, och
    // saknas den är det ett fel som måste synas i listan, inte försvinna ur
    // den. Detsamma gäller köp av en enda kurs, där det inte råder något
    // tvivel om vilken kurs som avses.
    const manualSchedule =
      !item.purchase.product.autobook && item.purchase._count.PurchaseItems > 1;
    if (manualSchedule && !bookedInCourse.has(key)) continue;

    const remaining = showRemaining(
      calcRemainingCount({
        purchase: {
          type: item.purchase.type,
          remainingCount: item.purchase.remainingCount,
        },
        purchaseItem: {
          unlimited: item.unlimited,
          remainingCount: item.remainingCount,
        },
      }),
    );

    // Har eleven flera köp på samma kurs vinner det med mest kvar.
    const existing = students.get(key);
    if (existing && existing.remaining === "∞") continue;

    students.set(key, {
      studentKey: key,
      userId: user.id,
      participantId: participant?.id ?? null,
      name: participant?.name ?? user.name,
      customerName: participant ? user.name : null,
      source: "purchase",
      remaining: String(remaining),
      booked: bookedHere.has(key),
    });
  }

  for (const adjustment of adjustments) {
    if (adjustment.status !== "ADDED") continue;
    if (students.has(adjustment.studentKey)) continue;

    const name = adjustment.participant?.name ?? adjustment.user?.name;
    if (!name) continue;

    students.set(adjustment.studentKey, {
      studentKey: adjustment.studentKey,
      userId: adjustment.userId,
      participantId: adjustment.participantId,
      name,
      customerName: adjustment.participant?.addedBy?.name ?? null,
      source: "manual",
      remaining: null,
      booked: bookedHere.has(adjustment.studentKey),
    });
  }

  return [...students.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "sv"),
  );
}
