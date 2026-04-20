"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type z from "zod";
import type {
  Booking,
  Participant,
  Product,
  ProductType,
  Purchase,
  PurchaseItem,
  User,
} from "@/generated/prisma/client";
import { AddStudentToLessonForm } from "@/validations/adminforms";
import { auth } from "../auth";
import prisma from "../prisma";
import { isAdminRole } from "./admin-shared";
import { handleClips } from "./purchase-actions";
import { calcRemainingCount, hasRemainingCount } from "./purchase-helpers";

export type StudentWithPurchaseItemsWithCourse = {
  studentId: string;
  customer: { id: string; name: string }; // För att kunna ange userId i UI.
  participant: Participant | null; // För att visa deltagaren
  displayName: string; // Hur namnet skall visas i select för deltagare dvs Deltagarnamn (köpare).
  purchaseItems: {
    purchaseItem: {
      id: string;
      remainingCount: number | null;
      unlimited: boolean;
    };
    purchase: {
      id: string;
      type: ProductType;
      participant: Participant | null;
      remainingCount: number | null;
      product: { id: string; name: string };
    };
  }[];
};

/**
 * Type for users with their purchases for a specific course.
 * Used in admin booking management.
 */
export type UserPurchasesForCourse = {
  id: string;
  name: string;
  purchases: {
    id: string;
    type: "COURSE" | "PACK" | "CLIP";
    remainingCount: number | null;
    participant: Participant | null;
    product: {
      id: string;
      name: string;
    };
    PurchaseItems: {
      id: string;
      courseId: string;
      remainingCount: number;
      unlimited: boolean;
      course: {
        id: string;
        name: string;
      };
    }[];
  }[];
};

export type BookingWithUserAndParticipant = Booking & {
  user: User;
  purchaseItem: {
    purchase: { participant: Participant | null; product: Product } & Purchase;
  } & PurchaseItem;
};

/**
 * Gets all users that have purchased products containing a specific course.
 * @param courseId The course to filter by.
 * @returns Array of users with their purchases for that course.
 * @auth Admin
 */
export async function getUsersWithPurchasedProductsWithCourseInIt(
  courseId: string,
): Promise<StudentWithPurchaseItemsWithCourse[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  try {
    const users = await prisma.user.findMany({
      where: {
        purchases: {
          some: {
            PurchaseItems: {
              some: {
                courseId: courseId,
              },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        purchases: {
          where: {
            PurchaseItems: {
              some: {
                courseId: courseId,
              },
            },
          },
          select: {
            id: true,
            participant: true,
            type: true,
            remainingCount: true,
            participantId: true,
            product: {
              select: {
                id: true,
                name: true,
              },
            },
            PurchaseItems: {
              where: {
                courseId: courseId,
              },
              select: {
                id: true,
                courseId: true,
                remainingCount: true,
                unlimited: true,
                course: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const students = new Map<string, StudentWithPurchaseItemsWithCourse>();

    for (const user of users) {
      for (const purchase of user.purchases) {
        const ownerName = user.name;
        const part = purchase.participant?.name ?? ownerName;
        const isOwner = part === ownerName;
        const studentId = purchase.participant?.id ?? user.id;
        const displayName = isOwner
          ? ownerName
          : `${part} (kund: ${ownerName})`;

        const nextPurchaseItems = purchase.PurchaseItems.map(
          (purchaseItem) => ({
            purchaseItem: {
              id: purchaseItem.id,
              remainingCount: purchaseItem.remainingCount,
              unlimited: purchaseItem.unlimited,
            },
            purchase: {
              id: purchase.id,
              type: purchase.type,
              participant: purchase.participant,
              remainingCount: purchase.remainingCount,
              product: purchase.product,
            },
          }),
        );

        const existing = students.get(studentId);
        if (!existing) {
          students.set(studentId, {
            studentId,
            customer: { id: user.id, name: user.name },
            participant: purchase.participant,
            displayName,
            purchaseItems: nextPurchaseItems,
          });
          continue;
        }

        const existingIds = new Set(
          existing.purchaseItems.map((item) => item.purchaseItem.id),
        );
        for (const item of nextPurchaseItems) {
          if (!existingIds.has(item.purchaseItem.id)) {
            existing.purchaseItems.push(item);
          }
        }
      }
    }

    return [...students.values()];
  } catch (e) {
    console.error("Error fetching users with purchases:", e);
    return [];
  }
}

export async function getBookings(
  lessonId: string,
): Promise<BookingWithUserAndParticipant[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  try {
    const bookings = await prisma.booking.findMany({
      where: { lessonId },
      include: {
        user: true,
        purchaseItem: {
          include: {
            purchase: { include: { participant: true, product: true } },
          },
        },
      },
    });

    if (bookings) return bookings;

    return [];
  } catch (e) {
    console.error("Fel vid bokning:", e);
    return [];
  }
}

// Kanske flytta ut denna sen från admin, tänker att vi använder samma för bokning ifrån profilsidan också.
export async function addUserInLesson(
  formData: z.output<typeof AddStudentToLessonForm>,
): Promise<{ success: boolean; msg: string }> {
  const validated = await AddStudentToLessonForm.parseAsync(formData);
  const session = await auth.api.getSession({ headers: await headers() });
  const isAdmin = await isAdminRole();

  if (!session) return { success: false, msg: "Ingen session." };
  if (session.user.id !== validated.userId) {
    if (!isAdmin) return { success: false, msg: "Ingen behörighet." };
  }

  try {
    // hämta purchaseItem och purchase för kontroller
    const pitem = await prisma.purchaseItem.findUnique({
      where: { id: validated.purchaseItemId },
      include: { purchase: true, course: true },
    });

    if (!pitem) return { success: false, msg: "Ingen purchaseItem hittades." };
    // Kontrollera om purchaseItem redan har använts på lektionen.

    const existingBooking = await prisma.booking.findFirst({
      where: pitem.purchase.participantId
        ? {
            // Deltagare-bokning: samma participant får inte bokas två gånger
            lessonId: validated.lessonId,
            purchaseItem: {
              purchase: { participantId: pitem.purchase.participantId },
            },
          }
        : {
            // Owner-bokning: samma user får inte bokas två gånger som owner
            lessonId: validated.lessonId,
            userId: validated.userId,
            purchaseItem: {
              purchase: { participantId: null },
            },
          },
    });

    if (existingBooking) {
      return {
        success: false,
        msg: "Deltagaren har redan bokats på denna lektion.",
      };
    }

    // 2. Kolla status på lektionen
    const lesson = await prisma.lesson.findUnique({
      where: { id: validated.lessonId },
    });

    if (!lesson || lesson.cancelled) {
      return {
        success: false,
        msg: "Lektionen är inställd eller hittades inte.",
      };
    }

    if (!pitem.purchase)
      return { success: false, msg: "Ingen purchase hittades." };

    // Kolla så kursen är samma.
    if (pitem?.courseId !== lesson.courseId)
      return { success: false, msg: "Kursen stämmer ej med vald produkt." };

    const hasClips = hasRemainingCount(
      calcRemainingCount({ purchase: pitem.purchase, purchaseItem: pitem }),
    );

    if (!hasClips)
      return { success: false, msg: "inga tillgängliga klipp i vald produkt" };

    if (!isAdmin && lesson.startTime.getTime() < Date.now()) {
      return {
        success: false,
        msg: "Lektionen har redan varit, ednast lärare kan lägga in bakåt i tiden.",
      };
    }

    // 3. Utför bokning och saldo-dragning i en transaktion
    await prisma.$transaction(async (tx) => {
      await tx.booking.create({
        data: {
          lessonId: validated.lessonId,
          userId: validated.userId,
          purchaseItemId: validated.purchaseItemId,
        },
      });

      const clipResult = await handleClips(tx, validated.purchaseItemId, -1);

      if (!clipResult.success) {
        throw new Error(clipResult.msg || "Kunde inte uppdatera saldo.");
      }
    });

    revalidatePath("/admin/lectures");
    revalidatePath("/admin");
    revalidatePath("/user");

    return { success: true, msg: `Bokning slutförd!` };
  } catch (e) {
    console.error("Fel vid admin-bokning:", e);
    return { success: false, msg: "Ett tekniskt fel uppstod vid bokningen." };
  }
}

/**
 * Admin function to remove a user from a lesson and restore their clips.
 * @param purchaseItemId The purchaseItem to remove.
 * @param lessonId The lesson to remove from.
 * @returns Success status and message.
 * @auth Admin
 */
export async function removeUserFromLesson(
  purchaseItemId: string,
  lessonId: string,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "Ingen behörighet." };

  try {
    // 1. Hitta bokningen
    const booking = await prisma.booking.findFirst({
      where: {
        purchaseItem: { id: purchaseItemId },
        lessonId: lessonId,
      },
    });

    if (!booking) {
      return { success: false, msg: "Bokningen hittades inte." };
    }

    // 2. Ta bort bokningen och återställ saldo i en transaktion
    await prisma.$transaction(async (tx) => {
      // Återställ saldo
      const clipResult = await handleClips(tx, booking.purchaseItemId, 1);

      if (!clipResult.success) {
        throw new Error(clipResult.msg || "Kunde inte återställa saldo.");
      }

      // Ta bort bokningen
      await tx.booking.delete({
        where: { id: booking.id },
      });
    });

    revalidatePath("/admin/lectures");
    revalidatePath("/admin/students");

    return { success: true, msg: "Bokningen har tagits bort." };
  } catch (e) {
    console.error("Fel vid borttagning av bokning:", e);
    return { success: false, msg: "Ett tekniskt fel uppstod." };
  }
}
