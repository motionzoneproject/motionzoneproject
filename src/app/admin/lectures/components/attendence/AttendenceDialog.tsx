import { DialogTrigger } from "@radix-ui/react-dialog";
import { EditIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Lesson } from "@/generated/prisma/client";
import {
  type BookingWithUserAndParticipant,
  getBookings,
  getUsersWithPurchasedProductsWithCourseInIt,
  type StudentWithPurchaseItemsWithCourse,
} from "@/lib/actions/admin";
import { getFullCourseNameFromId } from "@/lib/actions/server-actions";
import { AttendenceForm } from "./AttendenceForm";

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
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <EditIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hantera närvaro</DialogTitle>
          <DialogDescription>
            Lägg till eller ta bort elever från lektionen.
            <br />
            Gäller {courseName} ({lesson.startTime.toLocaleDateString("sv-SE")}{" "}
            {lesson.startTime.toLocaleTimeString("sv-SE", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {" - "}
            {lesson.endTime.toLocaleTimeString("sv-SE", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            )
          </DialogDescription>
        </DialogHeader>
        <AttendenceForm
          lessonId={lesson.id}
          bookings={bookings}
          studentsAndPurchases={studentsAndPurchases}
        />
      </DialogContent>
    </Dialog>
  );
}
