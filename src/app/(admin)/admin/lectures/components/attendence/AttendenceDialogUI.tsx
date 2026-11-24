"use client";

import { DialogTrigger } from "@radix-ui/react-dialog";
import { CalendarCheck, Loader2, Users } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BookingWithUserAndParticipant } from "@/lib/actions/admin";
import {
  getLessonBookings,
  type LessonBookings,
} from "@/lib/actions/attendance-actions";
import { studentKeyOf } from "@/lib/course-roster";
import { formatDateToInputStr } from "@/lib/date-utils";
import { dbToFormTime } from "@/lib/time-convert";
import { CourseRosterDialog } from "../../../components/CourseRosterDialog";
import { AttendenceForm } from "./AttendenceForm";
import { BookingAttendanceTools } from "./BookingAttendanceTools";

export type BookingsDialogLesson = {
  id: string;
  courseId: string;
  startTime: Date;
  endTime: Date;
};

interface Props {
  lesson: BookingsDialogLesson;
  /** Antalet bokningar, för knappen. Resten hämtas när dialogen öppnas. */
  bookingCount: number;
}

/**
 * Bokningarna på en lektion. Datan hämtas när dialogen öppnas, inte när
 * sidan renderas — dialogen står på varje lektion i listorna, och de flesta
 * öppnas aldrig.
 */
export function AttendeDialogUI({ lesson, bookingCount }: Props) {
  const id = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<LessonBookings | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      setData(await getLessonBookings(lesson.id));
    } finally {
      setIsLoading(false);
    }
  };

  const onOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) void load();
  };

  const count = data?.bookings.length ?? bookingCount;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <CalendarCheck className="h-4 w-4" />
          Bokningar ({bookingCount})
        </Button>
      </DialogTrigger>
      <DialogContent id={id} className="max-h-[90dvh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Hantera bokningar ({count}st)</DialogTitle>
          <DialogDescription>
            Boka in eller av elever på lektionen. Det här är bokningarna: en
            inbokning drar ett tillfälle ur elevens köp och en avbokning lämnar
            tillbaka det. Närvaron tar du under Närvaro.
            <br />
            Gäller {data?.courseName ?? "lektionen"} (
            {formatDateToInputStr(lesson.startTime)}{" "}
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
            onClosed={() => void load()}
            trigger={
              <Button variant="outline" size="sm" className="gap-2">
                <Users className="h-4 w-4" />
                Hantera elever på kursen
              </Button>
            }
          />
        </div>
        {data ? (
          <BookingsContent
            lessonId={lesson.id}
            data={data}
            onChanged={() => void load()}
          />
        ) : isLoading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Kunde inte hämta bokningarna.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BookingsContent({
  lessonId,
  data,
  onChanged,
}: {
  lessonId: string;
  data: LessonBookings;
  onChanged: () => void;
}) {
  const { bookings, attendance, studentsAndPurchases } = data;

  // Närvaron per bokning, via elevnyckeln. En bokning utan markering eller
  // med frånvaro räknas som utan närvaro.
  const statusOf = (b: BookingWithUserAndParticipant) =>
    attendance.byStudentKey[studentKeyOf(b.purchaseItem.purchase)] ?? null;
  const active = bookings.filter((b) => !b.cancelled);
  const missing = active.filter((b) => statusOf(b) !== "PRESENT").length;

  return (
    <>
      <BookingAttendanceTools
        lessonId={lessonId}
        taken={attendance.taken}
        missing={missing}
        total={active.length}
        presentWithoutBooking={attendance.presentWithoutBooking}
        onChanged={onChanged}
      />
      <AttendenceForm
        lessonId={lessonId}
        bookings={bookings}
        studentsAndPurchases={studentsAndPurchases}
        attendanceTaken={attendance.taken}
        statusOf={statusOf}
        onChanged={onChanged}
      />
    </>
  );
}
