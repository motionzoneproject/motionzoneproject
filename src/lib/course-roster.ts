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
    lessonId
      ? prisma.booking.findMany({
          where: { lessonId, cancelled: false },
          select: {
            purchaseItem: {
              select: {
                purchase: {
                  select: { userId: true, participantId: true },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const bookedKeys = new Set(
    bookings.map((b) =>
      studentKeyOf({
        participantId: b.purchaseItem.purchase.participantId,
        userId: b.purchaseItem.purchase.userId,
      }),
    ),
  );

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
      booked: bookedKeys.has(key),
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
      booked: bookedKeys.has(adjustment.studentKey),
    });
  }

  return [...students.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "sv"),
  );
}
