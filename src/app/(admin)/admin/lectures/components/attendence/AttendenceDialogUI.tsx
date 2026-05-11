"use client";

import { DialogTrigger } from "@radix-ui/react-dialog";
import { EditIcon } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Lesson } from "@/generated/prisma/client";
import type {
  BookingWithUserAndParticipant,
  StudentWithPurchaseItemsWithCourse,
} from "@/lib/actions/admin";
import { AttendenceForm } from "./AttendenceForm";

interface Props {
  courseName: string;
  lesson: Lesson;
  studentsAndPurchases: StudentWithPurchaseItemsWithCourse[];
  bookings: BookingWithUserAndParticipant[];
}

export function AttendeDialogUI({
  courseName,
  lesson,
  bookings,
  studentsAndPurchases,
}: Props) {
  const id = useId();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost">
          <EditIcon />({bookings.length}st)
        </Button>
      </DialogTrigger>
      <DialogContent id={id} className="max-h-[90dvh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Hantera närvaro ({bookings.length}st)</DialogTitle>
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
