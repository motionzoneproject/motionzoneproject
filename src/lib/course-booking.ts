// Att boka ut en elev från en kurs. Delas av elevlistan ("Ta bort från
// kursen") och schemadialogen (bocka ur en kurs), så att båda gör samma sak.
//
// Ligger utanför en "use server"-fil: det här är muterande hjälpare som bara
// ska nås från serverkod som redan kontrollerat behörigheten.

import { Prisma } from "@/generated/prisma/client";
import { handleClips, type PrismaTx } from "./clips";

/**
 * Tar bort kursradernas kommande bokningar och lämnar tillbaka saldot.
 * Lektioner som redan varit rörs inte — de är historik.
 *
 * Kursraderna låses först, och saldot återställs med det antal bokningar som
 * faktiskt togs bort. Två samtidiga anrop — ett dubbelklick, eller två admins
 * — såg annars samma bokningar och lämnade tillbaka saldot två gånger.
 *
 * @returns Antal borttagna bokningar.
 */
export async function unbookFutureLessons(
  tx: PrismaTx,
  purchaseItemIds: string[],
  now: Date = new Date(),
): Promise<number> {
  if (purchaseItemIds.length === 0) return 0;

  // Sorterat, så att två anrop alltid låser i samma ordning och inte kan
  // vänta på varandra.
  await tx.$queryRaw`SELECT id FROM purchase_item WHERE id IN (${Prisma.join(
    purchaseItemIds,
  )}) ORDER BY id FOR UPDATE`;

  let total = 0;
  for (const purchaseItemId of purchaseItemIds) {
    const { count } = await tx.booking.deleteMany({
      where: { purchaseItemId, lesson: { startTime: { gte: now } } },
    });
    if (count === 0) continue;

    const clipResult = await handleClips(tx, purchaseItemId, count);
    if (!clipResult.success)
      throw new Error(clipResult.msg || "Kunde inte återställa saldo.");

    total += count;
  }

  return total;
}

/**
 * Sparar att studion tagit bort eleven från kursen. En borttagning vinner
 * över köpen och bokningarna i elevlistan, så att gamla bokningar inte håller
 * kvar en elev som slutat.
 */
export async function markRemovedFromCourse(
  tx: PrismaTx,
  input: {
    courseId: string;
    studentKey: string;
    userId: string | null;
    participantId: string | null;
    changedByUserId: string;
  },
) {
  await tx.courseRosterEntry.upsert({
    where: {
      courseId_studentKey: {
        courseId: input.courseId,
        studentKey: input.studentKey,
      },
    },
    update: { status: "REMOVED", changedByUserId: input.changedByUserId },
    create: { ...input, status: "REMOVED" },
  });
}
