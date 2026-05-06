import type { Lesson } from "@/generated/prisma/client";
import {
  type BookingWithUserAndParticipant,
  getBookings,
  getUsersWithPurchasedProductsWithCourseInIt,
  type StudentWithPurchaseItemsWithCourse,
} from "@/lib/actions/admin";
import { getFullCourseNameFromId } from "@/lib/actions/server-actions";
import { AttendeDialogUI } from "./AttendenceDialogUI";

interface Props {
  lesson: Lesson;
}

export async function AttendeDialog({ lesson }: Props) {
  const courseName = await getFullCourseNameFromId(lesson.courseId);

  const studentsAndPurchases: StudentWithPurchaseItemsWithCourse[] =
    await getUsersWithPurchasedProductsWithCourseInIt(lesson.courseId);

  const bookings: BookingWithUserAndParticipant[] = await getBookings(
    lesson.id,
  );

  return (
    <AttendeDialogUI
      courseName={courseName}
      lesson={lesson}
      studentsAndPurchases={studentsAndPurchases}
      bookings={bookings}
    />
  );
}
