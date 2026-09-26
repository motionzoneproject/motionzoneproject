import type { Lesson } from "@/generated/prisma/client";
import {
  type BookingWithUserAndParticipant,
  getBookings,
  getUsersWithPurchasedProductsWithCourseInIt,
  type StudentWithPurchaseItemsWithCourse,
} from "@/lib/actions/admin";
import { getBookingAttendance } from "@/lib/actions/attendance-actions";
import { getFullCourseNameFromId } from "@/lib/actions/server-actions";
import { AttendeDialogUI } from "./AttendenceDialogUI";

interface Props {
  lesson: Lesson;
}

export async function AttendeDialog({ lesson }: Props) {
  const courseName = await getFullCourseNameFromId(lesson.courseId);

  const studentsAndPurchases: StudentWithPurchaseItemsWithCourse[] =
    await getUsersWithPurchasedProductsWithCourseInIt(lesson.courseId);

  const [bookings, attendance]: [
    BookingWithUserAndParticipant[],
    Awaited<ReturnType<typeof getBookingAttendance>>,
  ] = await Promise.all([
    getBookings(lesson.id),
    getBookingAttendance(lesson.id),
  ]);

  return (
    <AttendeDialogUI
      courseName={courseName}
      lesson={lesson}
      studentsAndPurchases={studentsAndPurchases}
      bookings={bookings}
      attendance={attendance}
    />
  );
}
