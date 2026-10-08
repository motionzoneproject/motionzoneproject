// Hjälpare för order-, kassa-, klipp- och bokningstesterna.

import prisma from "@/lib/prisma";
import type { InvoiceRecipientInput } from "@/validations/userforms";
import { actAs, getTestSession } from "./session";

type Who = { id: string; role?: string | null } | null;

/** Kör `fn` som `user` (eller utloggad med null) och återställer sessionen. */
export async function as<T>(user: Who, fn: () => Promise<T>): Promise<T> {
  const previous = getTestSession();
  actAs(user ? { id: user.id, role: user.role ?? null } : null);
  try {
    return await fn();
  } finally {
    const u = previous?.user;
    actAs(u ? { id: u.id, role: u.role ?? null } : null);
  }
}

/** En giltig fakturamottagare: en vuxen "annan" person. */
export function invoiceOther(
  overrides: Partial<InvoiceRecipientInput> = {},
): InvoiceRecipientInput {
  return {
    kind: "other",
    invoiceName: "Förälder Testsson",
    invoiceEmail: "faktura@test.local",
    invoicePhone: "",
    adultConfirmed: true,
    ...overrides,
  };
}

/** Lägger in en bokning direkt i databasen (t.ex. historik på en passerad lektion). */
export async function insertBooking(opts: {
  lessonId: string;
  purchaseItemId: string;
  userId: string;
}) {
  return prisma.booking.create({ data: opts });
}

export async function pastLessonsOf(courseId: string) {
  return prisma.lesson.findMany({
    where: { courseId, startTime: { lt: new Date() } },
    orderBy: { startTime: "asc" },
  });
}

export async function futureLessonsOf(courseId: string) {
  return prisma.lesson.findMany({
    where: { courseId, startTime: { gte: new Date() }, cancelled: false },
    orderBy: { startTime: "asc" },
  });
}
