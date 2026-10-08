// Testdata. Köp skapas genom appens egna flöde — createOrder, approveOrder,
// createPurchaseFromOrder — så att de hamnar i samma skick som i produktion,
// autobokning inräknad.

import { randomUUID } from "node:crypto";
import type { ProductType } from "@/generated/prisma/client";
import { approveOrder, createPurchaseFromOrder } from "@/lib/actions/orders";
import { createOrder } from "@/lib/orders";
import prisma from "@/lib/prisma";
import { actAs, getTestSession } from "./session";

const DAY = 24 * 60 * 60 * 1000;

function uid(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export async function createUser(
  opts: { role?: "admin" | "teacher" | "user" | null; name?: string } = {},
) {
  const id = uid(opts.role ?? "user");
  return prisma.user.create({
    data: {
      id,
      name: opts.name ?? id,
      email: `${id}@test.local`,
      emailVerified: true,
      role: opts.role === undefined ? "user" : opts.role,
    },
  });
}

export async function createParticipant(owner: { id: string }, name?: string) {
  return prisma.participant.create({
    data: { name: name ?? uid("deltagare"), addedByUserId: owner.id },
  });
}

let termin: { id: string } | null = null;

async function getTermin() {
  if (termin) return termin;
  const now = Date.now();
  termin = await prisma.termin.create({
    data: {
      name: "Testtermin",
      startDate: new Date(now - 90 * DAY),
      endDate: new Date(now + 90 * DAY),
    },
  });
  return termin;
}

/**
 * En kurs med lektioner: `past` som redan varit och `future` kommande,
 * en per vecka. `cancelledFuture` av de kommande är inställda.
 */
export async function createCourse(opts: {
  teacher: { id: string };
  name?: string;
  past?: number;
  future?: number;
  cancelledFuture?: number;
}) {
  const t = await getTermin();
  const course = await prisma.course.create({
    data: {
      name: opts.name ?? uid("kurs"),
      description: "Testkurs",
      teacherId: opts.teacher.id,
    },
  });

  const schemaItem = await prisma.schemaItem.create({
    data: {
      weekday: "MONDAY",
      timeStart: new Date("1970-01-01T17:00:00Z"),
      timeEnd: new Date("1970-01-01T18:00:00Z"),
      terminId: t.id,
      courseId: course.id,
    },
  });

  const past = opts.past ?? 0;
  const future = opts.future ?? 4;
  const cancelled = opts.cancelledFuture ?? 0;
  const now = Date.now();
  const lessons = [];

  for (let i = past; i >= 1; i--) {
    lessons.push({ start: now - i * 7 * DAY, cancelled: false });
  }
  for (let i = 1; i <= future; i++) {
    lessons.push({ start: now + i * 7 * DAY, cancelled: i <= cancelled });
  }

  for (const l of lessons) {
    await prisma.lesson.create({
      data: {
        startTime: new Date(l.start),
        endTime: new Date(l.start + 60 * 60 * 1000),
        cancelled: l.cancelled,
        courseId: course.id,
        teacherId: opts.teacher.id,
        schemaItemId: schemaItem.id,
        terminId: t.id,
      },
    });
  }

  return course;
}

export async function createProduct(opts: {
  type: ProductType;
  courses: { id: string }[];
  /** Lektioner per kurs för COURSE/PACK. Ignoreras för CLIP. */
  lessonsIncluded?: number;
  unlimited?: boolean;
  /** Antal klipp för CLIP. */
  totalCount?: number;
  autobook?: boolean;
  maxCourses?: number | null;
  price?: number;
}) {
  return prisma.product.create({
    data: {
      name: uid(`produkt-${opts.type.toLowerCase()}`),
      description: "Testprodukt",
      type: opts.type,
      totalCount: opts.type === "CLIP" ? (opts.totalCount ?? 10) : null,
      autobook: opts.autobook ?? false,
      maxCourses: opts.maxCourses ?? null,
      price: opts.price ?? 100_00,
      unlimitedCustomers: true,
      courses: {
        create: opts.courses.map((c) => ({
          courseId: c.id,
          lessonsIncluded: opts.lessonsIncluded ?? 10,
          unlimited: opts.unlimited ?? false,
        })),
      },
    },
  });
}

/** Lägger en order som väntar på godkännande. */
export async function placeOrder(opts: {
  buyer: { id: string };
  product: { id: string; price: number };
  participant?: { id: string } | null;
  selectedCourseIds?: string[];
}) {
  return prisma.$transaction((tx) =>
    createOrder(tx, {
      userId: opts.buyer.id,
      items: [
        {
          productId: opts.product.id,
          count: 1,
          price: opts.product.price,
          participantId: opts.participant?.id ?? null,
          selectedCourseIds: opts.selectedCourseIds,
        },
      ],
    }),
  );
}

/**
 * Lägger, godkänner och skapar köpet för en order — som en admin gör det.
 * Autobokningen sker precis som i appen. Sessionen återställs efteråt.
 */
export async function buy(opts: {
  admin: { id: string };
  buyer: { id: string };
  product: { id: string; price: number };
  participant?: { id: string } | null;
  selectedCourseIds?: string[];
}) {
  const order = await placeOrder(opts);
  const previous = getTestSession();

  actAs({ id: opts.admin.id, role: "admin" });
  try {
    await approveOrder(order.id);
    await createPurchaseFromOrder(order.id);
  } finally {
    const u = previous?.user;
    actAs(u ? { id: u.id, role: u.role ?? null } : null);
  }

  const purchase = await prisma.purchase.findFirstOrThrow({
    where: { orderId: order.id },
    include: { PurchaseItems: true },
  });

  return { order, purchase, items: purchase.PurchaseItems };
}

export async function bookingsFor(purchaseItemId: string) {
  return prisma.booking.findMany({
    where: { purchaseItemId },
    include: { lesson: true },
    orderBy: { lesson: { startTime: "asc" } },
  });
}

export async function futureBookingCount(purchaseItemId: string) {
  return prisma.booking.count({
    where: { purchaseItemId, lesson: { startTime: { gte: new Date() } } },
  });
}
