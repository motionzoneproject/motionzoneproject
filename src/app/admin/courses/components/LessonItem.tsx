import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import type { Lesson } from "@/generated/prisma/client";
import type {
  BookingWithPurchaseParticipant,
  UserPurchasesForCourse,
} from "@/lib/actions/admin";
import LessonAttendanceForm from "./LessonAttendanceForm";
import LessonItemForm from "./LessonItemForm";

interface Props {
  lesson: Lesson;
  initialBookings: BookingWithPurchaseParticipant[];
  initialUsers: UserPurchasesForCourse[];
}

export default function LessonItem({
  lesson,
  initialBookings,
  initialUsers,
}: Props) {
  return (
    <div className="p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <span>{lesson.startTime.toLocaleDateString("sv-SE")}</span>
            {lesson.cancelled && <Badge variant="destructive">Inställd</Badge>}
          </div>
          <div className="text-xs text-muted-foreground">
            {lesson.startTime
              .toLocaleDateString("sv-SE", { weekday: "long" })
              .toUpperCase()}{" "}
            ·{" "}
            {lesson.startTime.toLocaleTimeString("sv-SE", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            -{" "}
            {lesson.endTime.toLocaleTimeString("sv-SE", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
        <LessonAttendanceForm
          lesson={lesson}
          initialBookings={initialBookings}
          initialUsers={initialUsers}
        />
      </div>
      <Accordion type="single" collapsible className="mt-3">
        <AccordionItem value="item-1">
          <AccordionTrigger>Hantera</AccordionTrigger>
          <AccordionContent>
            <LessonItemForm lesson={lesson} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
