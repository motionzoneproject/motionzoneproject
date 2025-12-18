"use server";

import type { Prisma } from "@/generated/prisma/client";
import prisma from "../prisma";
import { getSessionData } from "./sessiondata";

export type BookingWithLesson = Prisma.BookingGetPayload<{
  include: { lesson: true };
}>;

export async function getUserBookings(): Promise<{
  success: boolean;
  msg: string;
  bookings?: BookingWithLesson[];
}> {
  const sessionData = await getSessionData();
  const user = sessionData?.user;

  if (!user) return { success: false, msg: "No valid user session" };

  try {
    const lessonsWithBookings = await prisma.booking.findMany({
      where: { userId: user.id },
      include: { lesson: true },
    });

    return {
      success: !!lessonsWithBookings,
      msg: "Hämtade lektioner ",
      bookings: lessonsWithBookings,
    };
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
  }
}

export type LessonWithCourse = Prisma.LessonGetPayload<{
  include: { course: true };
}>;

export async function getUserLessons(): Promise<{
  success: boolean;
  msg: string;
  lessons?: LessonWithCourse[];
}> {
  const sessionData = await getSessionData();
  const user = sessionData?.user;

  if (!user) return { success: false, msg: "No valid user session" };

  try {
    // 1. Hitta alla courseId som användaren har köpt (där det finns klipp kvar)
    const userPurchases = await prisma.purchaseItem.findMany({
      where: {
        purchase: { userId: user.id },
        remainingCount: { gt: 0 },
      },
      select: { courseId: true },
    });

    const courseIds = userPurchases.map((p) => p.courseId);

    if (courseIds.length === 0) {
      return { success: true, msg: "Inga aktiva kurser hittades", lessons: [] };
    }

    // 2. Hämta alla lektioner för dessa kurser
    const lessons = await prisma.lesson.findMany({
      where: {
        courseId: { in: courseIds },
        cancelled: false, // Vi visar nog bara lektioner som inte är inställda
        // startTime: { gte: new Date() } // Valfritt: Visa bara framtida lektioner. Nej man kanske vill se sina tidigare boknignar.
      },
      include: { course: true },
      orderBy: { startTime: "asc" },
    });

    return {
      success: true,
      msg: "Hämtade bokningsbara lektioner",
      lessons: lessons,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte hämta lektioner" };
  }
}
