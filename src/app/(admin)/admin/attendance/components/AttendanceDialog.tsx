"use client";

import { ClipboardCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  type AttendanceLesson,
  getLessonAttendance,
} from "@/lib/actions/attendance-actions";
import { formatDateToInputStr } from "@/lib/date-utils";
import { dbToFormTime } from "@/lib/time-convert";
import { attendanceSummary } from "./attendance-summary";
import { LessonAttendance } from "./LessonAttendance";

/**
 * Tar närvaro på en lektion utan att lämna sidan man står på.
 *
 * Läraren möter lektionen i översikten och i lektionslistan, och ska kunna
 * bocka av gruppen därifrån. Närvarosidan är kvar för den som vill se hela
 * dagen på en gång, eller fylla i i efterhand.
 */
export function AttendanceDialog({ lessonId }: { lessonId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lesson, setLesson] = useState<AttendanceLesson | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      setLesson(await getLessonAttendance(lessonId));
    } finally {
      setIsLoading(false);
    }
  };

  const onOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) void load();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <ClipboardCheck className="h-4 w-4" />
          Närvaro
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-auto p-0 sm:max-w-lg">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle>
            Närvaro{lesson ? `: ${lesson.courseName}` : ""}
            {lesson?.cancelled && (
              <span className="ml-2 text-xs font-medium uppercase text-destructive">
                Inställd
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {lesson ? (
              <>
                {formatDateToInputStr(lesson.startTime)}{" "}
                {dbToFormTime(lesson.startTime)}–{dbToFormTime(lesson.endTime)}
                {lesson.studioName ? ` · ${lesson.studioName}` : ""}
                {" · "}
                {attendanceSummary(lesson)}
              </>
            ) : (
              "Bocka av vilka som är på plats."
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading && !lesson ? (
          <div className="flex items-center gap-2 p-6 pt-0 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Hämtar elevlistan...
          </div>
        ) : !lesson ? (
          <p className="p-6 pt-0 text-sm text-muted-foreground">
            Kunde inte hämta lektionen, eller så saknar du behörighet.
          </p>
        ) : (
          <LessonAttendance lesson={lesson} onChanged={() => void load()} />
        )}
      </DialogContent>
    </Dialog>
  );
}
