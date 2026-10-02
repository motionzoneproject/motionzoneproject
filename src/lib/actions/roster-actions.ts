"use server";

import { revalidatePath } from "next/cache";
import { handleClips } from "@/lib/clips";
import { mayManageCourse } from "@/lib/course-access";
import { placesStudentInCourse, studentKeyOf } from "@/lib/course-roster";
import { getCourseName } from "@/lib/tools";
import prisma from "../prisma";
import { isAdminRole } from "./admin";
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
 * Var eleven tillagd för hand och saknar köp i kursen tas den raden bort i
 * stället.
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

  // Tillagd för hand och utan köp i kursen: tillägget är det enda som håller
  // kvar eleven. Har hen också ett köp — en lärare la till, och admin bokade
  // sedan in — räcker det inte att ta bort tillägget, då står eleven kvar
  // med sina bokningar. Då tas hen bort på riktigt nedan, och raden blir en
  // borttagning.
  if (existing?.status === "ADDED" && items.length === 0) {
    await prisma.courseRosterEntry.delete({ where: { id: existing.id } });
    revalidateRosterViews();
    return { success: true, msg: `${name} är inte längre tillagd i kursen.` };
  }

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

export type CourseRosterStudent = {
  studentKey: string;
  name: string;
  /** Kunden som köpt, när eleven är en deltagare. */
  customerName: string | null;
  /** Produkterna som placerar eleven i kursen. Tom för en manuellt tillagd. */
  products: string[];
  /** Bokningar i kursen som inte är avbokade, kommande och tidigare. */
  bookings: number;
  addedManually: boolean;
  /**
   * Bara på en order som väntar på godkännande. Eleven bokas in när ordern
   * beviljas; till dess finns inget att ta bort, ordern nekas i stället.
   */
  pending: boolean;
};

export type CourseRoster = {
  courseId: string;
  courseName: string;
  students: CourseRosterStudent[];
};

/**
 * Vem som går en kurs, för "Hantera elever".
 *
 * Samma regel som elevlistan och antalet på kurssidan: köpen och bokningarna
 * enligt course-roster, ordrar som väntar på godkännande, sedan studions egna
 * ändringar — en borttagning vinner alltid, ett manuellt tillägg läggs till.
 * Samma lista, var den än öppnas.
 *
 * @auth Admin eller kursens lärare
 */
export async function getCourseRoster(
  courseId: string,
): Promise<CourseRoster | null> {
  if (!(await mayManageCourse(courseId))) return null;

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
  const students = rosters.get(courseId) ?? new Map();

  return {
    courseId: course.id,
    courseName: getCourseName(course),
    students: [...students.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "sv"),
    ),
  };
}

/**
 * Antalet elever per kurs, för kurssidan. Samma regel som "Hantera elever",
 * men för alla kurser på sidan i två frågor i stället för fyra per kurs.
 *
 * @auth Admin
 */
export async function getCourseStudentCounts(
  courseIds: string[],
): Promise<Record<string, number>> {
  if (!(await isAdminRole())) return {};

  const rosters = await collectRosters(courseIds);
  return Object.fromEntries(
    courseIds.map((id) => [id, rosters.get(id)?.size ?? 0]),
  );
}

/**
 * Vem som går kurserna: köpen och bokningarna enligt course-roster, ordrar
 * som väntar på godkännande enligt samma regel, sedan studions egna
 * ändringar. En borttagning vinner alltid, ett manuellt tillägg läggs till. Gemensam för listan och antalet, så att de inte kan
 * säga olika saker.
 */
async function collectRosters(
  courseIds: string[],
): Promise<Map<string, Map<string, CourseRosterStudent>>> {
  const [rows, pendingItems, entries] = await Promise.all([
    prisma.purchaseItem.findMany({
      where: { courseId: { in: courseIds } },
      select: {
        courseId: true,
        orderItem: {
          select: { courseSelections: { select: { courseId: true } } },
        },
        _count: { select: { bookings: { where: { cancelled: false } } } },
        purchase: {
          select: {
            userId: true,
            participantId: true,
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

  const rosters = new Map<string, Map<string, CourseRosterStudent>>();
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

    const students = rosterOf(row.courseId);
    const existing = students.get(key);
    if (existing) {
      existing.products.push(row.purchase.product.name);
      existing.bookings += row._count.bookings;
      continue;
    }

    students.set(key, {
      studentKey: key,
      name: row.purchase.participant?.name ?? row.purchase.user.name,
      customerName: row.purchase.participant ? row.purchase.user.name : null,
      products: [row.purchase.product.name],
      bookings: row._count.bookings,
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
        name: item.participant?.name ?? item.order.user.name,
        customerName: item.participant ? item.order.user.name : null,
        products: [item.product.name],
        bookings: 0,
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
      name,
      customerName: entry.participant?.addedBy.name ?? null,
      products: [],
      bookings: 0,
      addedManually: true,
      pending: false,
    });
  }

  return rosters;
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
      where: {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } },
        ],
      },
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
