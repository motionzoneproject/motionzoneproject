"use client";

import { DialogTrigger } from "@radix-ui/react-dialog";
import { CalendarCheck, Users } from "lucide-react";
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
import type { BookingAttendance } from "@/lib/actions/attendance-actions";
import { studentKeyOf } from "@/lib/course-roster";
import { formatDateToInputStr } from "@/lib/date-utils";
import { dbToFormTime } from "@/lib/time-convert";
import { CourseRosterDialog } from "../../../components/CourseRosterDialog";
import { AttendenceForm } from "./AttendenceForm";
import { BookingAttendanceTools } from "./BookingAttendanceTools";

interface Props {
  courseName: string;
  lesson: Lesson;
  studentsAndPurchases: StudentWithPurchaseItemsWithCourse[];
  bookings: BookingWithUserAndParticipant[];
  attendance: BookingAttendance;
}

export function AttendeDialogUI({
  courseName,
  lesson,
  bookings,
  studentsAndPurchases,
  attendance,
}: Props) {
  const id = useId();

  // Närvaron per bokning, via elevnyckeln. En bokning utan markering eller
  // med frånvaro räknas som utan närvaro.
  const statusOf = (b: BookingWithUserAndParticipant) =>
    attendance.byStudentKey[studentKeyOf(b.purchaseItem.purchase)] ?? null;
  const active = bookings.filter((b) => !b.cancelled);
  const missing = active.filter((b) => statusOf(b) !== "PRESENT").length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <CalendarCheck className="h-4 w-4" />
          Bokningar ({bookings.length})
        </Button>
      </DialogTrigger>
      <DialogContent id={id} className="max-h-[90dvh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Hantera bokningar ({bookings.length}st)</DialogTitle>
          <DialogDescription>
            Boka in eller av elever på lektionen. Det här är bokningarna: en
            inbokning drar ett tillfälle ur elevens köp och en avbokning lämnar
            tillbaka det. Närvaron tar du under Närvaro.
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
        <BookingAttendanceTools
          lessonId={lesson.id}
          taken={attendance.taken}
          missing={missing}
          total={active.length}
        />
        <AttendenceForm
          lessonId={lesson.id}
          bookings={bookings}
          studentsAndPurchases={studentsAndPurchases}
          attendanceTaken={attendance.taken}
          statusOf={statusOf}
        />
      </DialogContent>
    </Dialog>
  );
}
