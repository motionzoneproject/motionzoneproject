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
  /**
   * Bara på en order som väntar på godkännande. Eleven bokas in när ordern
   * beviljas; till dess finns inget att ta bort, ordern nekas i stället.
   */
  pending: boolean;
};

export type LoadedCourseRoster = {
  courseId: string;
  courseName: string;
  students: RosterStudent[];
};

/**
 * Vem som går en kurs — kärnan bakom "Hantera elever" och närvaron.
 *
 * Samma regel som elevlistan och antalet på kurssidan, se collectRosters.
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

  const rosters = await collectRosters([courseId]);
  const students = rosters.get(courseId) ?? new Map<string, RosterStudent>();

  return {
    courseId: course.id,
    courseName: getCourseName(course),
    students: [...students.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "sv"),
    ),
  };
}

/**
 * Vem som går kurserna, per kurs och elev: köpen och bokningarna enligt
 * course-roster, ordrar som väntar på godkännande enligt samma regel, sedan
 * studions egna ändringar. En borttagning vinner alltid, ett manuellt
 * tillägg läggs till. Gemensam för listan, närvaron och antalet på
 * kurssidan, så att de inte kan säga olika saker.
 *
 * Tar många kurser på en gång, så att kurssidan inte behöver frågor per
 * kurs. Kontrollerar ingen behörighet; den som anropar ansvarar för det.
 */
export async function collectRosters(
  courseIds: string[],
): Promise<Map<string, Map<string, RosterStudent>>> {
  const [rows, pendingItems, entries] = await Promise.all([
    prisma.purchaseItem.findMany({
      where: { courseId: { in: courseIds } },
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
    // Ordrar som väntar på godkännande, som elevlistan visar som "Ej
    // beviljad än". Kursvalen gäller före produktens kurser.
    prisma.orderItem.findMany({
      where: {
        order: { status: "AWAITING_APPROVAL" },
        OR: [
          { courseSelections: { some: { courseId: { in: courseIds } } } },
          {
            courseSelections: { none: {} },
            product: { courses: { some: { courseId: { in: courseIds } } } },
          },
        ],
      },
      select: {
        participantId: true,
        participant: { select: { name: true } },
        order: { select: { userId: true, user: { select: { name: true } } } },
        product: {
          select: {
            name: true,
            autobook: true,
            courses: { select: { courseId: true } },
          },
        },
        courseSelections: { select: { courseId: true } },
      },
    }),
    prisma.courseRosterEntry.findMany({
      where: { courseId: { in: courseIds } },
      select: {
        courseId: true,
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
    entries
      .filter((e) => e.status === "REMOVED")
      .map((e) => `${e.courseId}|${e.studentKey}`),
  );

  const rosters = new Map<string, Map<string, RosterStudent>>();
  const rosterOf = (courseId: string) => {
    let roster = rosters.get(courseId);
    if (!roster) {
      roster = new Map();
      rosters.set(courseId, roster);
    }
    return roster;
  };

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
    if (removed.has(`${row.courseId}|${key}`)) continue;

    const remaining = calcRemainingCount({
      purchase: row.purchase,
      purchaseItem: row,
    });

    const students = rosterOf(row.courseId);
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
      pending: false,
    });
  }

  const wanted = new Set(courseIds);
  for (const item of pendingItems) {
    const ordered =
      item.courseSelections.length > 0
        ? item.courseSelections.map((s) => s.courseId)
        : item.product.courses.map((c) => c.courseId);
    const key = studentKeyOf({
      participantId: item.participantId,
      userId: item.order.userId,
    });

    for (const courseId of ordered) {
      if (!wanted.has(courseId) || removed.has(`${courseId}|${key}`)) continue;
      const placed = placesStudentInCourse({
        courseId,
        // Kursvalen är redan tillämpade i ordered.
        selectedCourseIds: [],
        autobook: item.product.autobook,
        courseCount: ordered.length,
        activeBookings: 0,
      });
      if (!placed) continue;

      const students = rosterOf(courseId);
      const existing = students.get(key);
      if (existing) {
        if (!existing.products.includes(item.product.name))
          existing.products.push(item.product.name);
        continue;
      }

      students.set(key, {
        studentKey: key,
        userId: item.participantId ? null : item.order.userId,
        participantId: item.participantId,
        name: item.participant?.name ?? item.order.user.name,
        customerName: item.participant ? item.order.user.name : null,
        products: [item.product.name],
        bookings: 0,
        remaining: null,
        addedManually: false,
        pending: true,
      });
    }
  }

  for (const entry of entries) {
    if (entry.status !== "ADDED") continue;
    const students = rosterOf(entry.courseId);
    if (students.has(entry.studentKey)) continue;
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
      pending: false,
    });
  }

  return rosters;
}
