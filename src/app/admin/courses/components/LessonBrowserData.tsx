import type { Lesson } from "@/generated/prisma/client";
import type { BookingWithPurchaseParticipant } from "@/lib/actions/admin";
import { getUsersWithPurchasedProductsWithCourseInIt } from "@/lib/actions/admin";
import prisma from "@/lib/prisma";
import LessonsBrowser from "./LessonsBrowser";

interface Props {
  courseId: string;
}

export default async function LessonBrowserData({ courseId }: Props) {
  const lessons: Lesson[] = await prisma.lesson.findMany({
    where: { courseId: courseId },
  });

  const bookings = await prisma.booking.findMany({
    where: { lesson: { courseId } },
    include: {
      purchaseItem: {
        include: {
          purchase: {
            include: {
              participant: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  const bookingsByLessonId = bookings.reduce(
    (acc, booking) => {
      const key = booking.lessonId;
      if (!acc[key]) acc[key] = [];
      acc[key].push(booking as BookingWithPurchaseParticipant);
      return acc;
    },
    {} as Record<string, BookingWithPurchaseParticipant[]>,
  );

  const usersInCourseResult =
    await getUsersWithPurchasedProductsWithCourseInIt(courseId);

  const terminer = await prisma.termin.findMany({
    where: { schemaItems: { some: { courseId: courseId } } },
  });

  return (
    <LessonsBrowser
      lessons={lessons}
      terminer={terminer}
      bookingsByLessonId={bookingsByLessonId}
      usersInCourse={usersInCourseResult.users ?? []}
    />
  );
}
