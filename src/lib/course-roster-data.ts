import { calcRemainingCount } from "./actions/purchase-helpers";
import { placesStudentInCourse, studentKeyOf } from "./course-roster";
import prisma from "./prisma";
import { getCourseName } from "./tools";

export type RosterStudent = {
  studentKey: string;
  userId: string | null;
  participantId: string | null;
  name: string;
  /** Kunden som köpt, när eleven är en deltagare. */
  customerName: string | null;
  /** Produkterna som placerar eleven i kursen. Tom för en manuellt tillagd. */
  products: string[];
  /** Bokningar i kursen som inte är avbokade, kommande och tidigare. */
  bookings: number;
  /** Högsta saldot bland kursraderna. Infinity för obegränsat, null utan köp. */
  remaining: number | null;
  addedManually: boolean;
};

export type LoadedCourseRoster = {
  courseId: string;
  courseName: string;
  students: RosterStudent[];
};

/**
 * Vem som går en kurs — kärnan bakom "Hantera elever" och närvaron.
 *
 * Samma regel som elevlistan och antalet på kurssidan: köpen och bokningarna
 * enligt course-roster, sedan studions egna ändringar — en borttagning vinner
 * alltid, ett manuellt tillägg läggs till. Samma lista, var den än öppnas.
 *
 * Kontrollerar ingen behörighet; den som anropar ansvarar för det.
 */
export async function loadCourseRoster(
  courseId: string,
): Promise<LoadedCourseRoster | null> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      name: true,
      minAge: true,
      maxAge: true,
      adult: true,
      level: true,
    },
  });
  if (!course) return null;

  const [rows, entries] = await Promise.all([
    prisma.purchaseItem.findMany({
      where: { courseId },
      select: {
        courseId: true,
        unlimited: true,
        remainingCount: true,
        orderItem: {
          select: { courseSelections: { select: { courseId: true } } },
        },
        _count: { select: { bookings: { where: { cancelled: false } } } },
        purchase: {
          select: {
            userId: true,
            participantId: true,
            type: true,
            remainingCount: true,
            user: { select: { name: true } },
            participant: { select: { name: true } },
            product: { select: { name: true, autobook: true } },
            _count: { select: { PurchaseItems: true } },
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
        user: { select: { name: true } },
        participant: {
          select: { name: true, addedBy: { select: { name: true } } },
        },
      },
    }),
  ]);

  const removed = new Set(
    entries.filter((e) => e.status === "REMOVED").map((e) => e.studentKey),
  );

  const students = new Map<string, RosterStudent>();

  for (const row of rows) {
    const placed = placesStudentInCourse({
      courseId: row.courseId,
      selectedCourseIds: row.orderItem.courseSelections.map((s) => s.courseId),
      autobook: row.purchase.product.autobook,
      courseCount: row.purchase._count.PurchaseItems,
      activeBookings: row._count.bookings,
    });
    if (!placed) continue;

    const key = studentKeyOf(row.purchase);
    if (removed.has(key)) continue;

    const remaining = calcRemainingCount({
      purchase: row.purchase,
      purchaseItem: row,
    });

    const existing = students.get(key);
    if (existing) {
      existing.products.push(row.purchase.product.name);
      existing.bookings += row._count.bookings;
      existing.remaining = Math.max(existing.remaining ?? 0, remaining);
      continue;
    }

    students.set(key, {
      studentKey: key,
      userId: row.purchase.participantId ? null : row.purchase.userId,
      participantId: row.purchase.participantId,
      name: row.purchase.participant?.name ?? row.purchase.user.name,
      customerName: row.purchase.participant ? row.purchase.user.name : null,
      products: [row.purchase.product.name],
      bookings: row._count.bookings,
      remaining,
      addedManually: false,
    });
  }

  for (const entry of entries) {
    if (entry.status !== "ADDED" || students.has(entry.studentKey)) continue;
    const name = entry.participant?.name ?? entry.user?.name;
    if (!name) continue;

    students.set(entry.studentKey, {
      studentKey: entry.studentKey,
      userId: entry.participantId ? null : entry.userId,
      participantId: entry.participantId,
      name,
      customerName: entry.participant?.addedBy.name ?? null,
      products: [],
      bookings: 0,
      remaining: null,
      addedManually: true,
    });
  }

  return {
    courseId: course.id,
    courseName: getCourseName(course),
    students: [...students.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "sv"),
    ),
  };
}
