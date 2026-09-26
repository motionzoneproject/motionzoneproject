"use client";

import { DialogTrigger } from "@radix-ui/react-dialog";
import { EditIcon, Users } from "lucide-react";
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
import { formatDateToInputStr } from "@/lib/date-utils";
import { dbToFormTime } from "@/lib/time-convert";
import { CourseRosterDialog } from "../../../components/CourseRosterDialog";
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
            Gäller {courseName} ({formatDateToInputStr(lesson.startTime)}{" "}
            {dbToFormTime(lesson.startTime)}
            {" - "}
            {dbToFormTime(lesson.endTime)})
          </DialogDescription>
        </DialogHeader>
        {/* Här ändras en enda lektion. Vem som går kursen över huvud taget
            ändras i kursens elevlista, som öppnas härifrån. */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            Ska eleven gå hela kursen, eller har hen slutat?
          </span>
          <CourseRosterDialog
            courseId={lesson.courseId}
            trigger={
              <Button variant="outline" size="sm" className="gap-2">
                <Users className="h-4 w-4" />
                Hantera elever på kursen
              </Button>
            }
          />
        </div>
        <AttendenceForm
          lessonId={lesson.id}
          bookings={bookings}
          studentsAndPurchases={studentsAndPurchases}
        />
      </DialogContent>
    </Dialog>
  );
}
