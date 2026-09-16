"use client";

import { CheckCheck, RotateCcw, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  type AttendanceLesson,
  releaseBookingForAbsence,
  saveAttendance,
} from "@/lib/actions/attendance-actions";
import { ManageRosterDialog } from "./ManageRosterDialog";

/**
 * En lektions elevlista med en kryssruta var.
 *
 * Används både på närvarosidan, där dagens lektioner ligger under varandra,
 * och i dialogen som öppnas från översikten och lektionslistan — läraren ska
 * kunna ta närvaro där hen redan står, inte tvingas till en annan sida.
 *
 * Rör varken bokningar eller klipp. Att markera någon som närvarande är ett
 * konstaterande, inte ett köp.
 */
export function LessonAttendance({
  lesson,
  onSaved,
}: {
  lesson: AttendanceLesson;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [marks, setMarks] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const student of lesson.students) {
      if (student.status !== null) {
        initial[student.studentKey] = student.status === "PRESENT";
      }
    }
    return initial;
  });

  const markAllPresent = () => {
    setMarks(() => {
      const next: Record<string, boolean> = {};
      for (const student of lesson.students) next[student.studentKey] = true;
      return next;
    });
  };

  const save = async () => {
    setIsSaving(true);
    try {
      const res = await saveAttendance(
        lesson.lessonId,
        lesson.students.map((student) => ({
          studentKey: student.studentKey,
          present: marks[student.studentKey] === true,
        })),
      );

      if (res.success) {
        toast.success(res.msg);
        onSaved?.();
        router.refresh();
      } else {
        toast.error(res.msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const release = async (studentKey: string) => {
    setReleasing(studentKey);
    try {
      const res = await releaseBookingForAbsence(lesson.lessonId, studentKey);
      if (res.success) {
        toast.success(res.msg);
        onSaved?.();
        router.refresh();
      } else {
        toast.error(res.msg);
      }
    } finally {
      setReleasing(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 p-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={markAllPresent}
          disabled={lesson.students.length === 0}
        >
          <CheckCheck className="h-4 w-4" />
          Alla närvarande
        </Button>

        <ManageRosterDialog
          courseId={lesson.courseId}
          courseName={lesson.courseName}
          trigger={
            <Button type="button" variant="ghost" size="sm">
              <UserPlus className="h-4 w-4" />
              Hantera elever
            </Button>
          }
        />
      </div>

      {lesson.students.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          Inga elever i listan. Elever hamnar här när de bokats in på kursen —
          använd Schema under Elever, eller lägg till någon under &ldquo;Hantera
          elever&rdquo;.
        </p>
      ) : (
        <ul className="divide-y">
          {lesson.students.map((student) => {
            const id = `${lesson.lessonId}-${student.studentKey}`;
            const value = marks[student.studentKey];

            return (
              <li key={student.studentKey}>
                <label
                  htmlFor={id}
                  className="flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-muted/40"
                >
                  <Checkbox
                    id={id}
                    className="h-6 w-6"
                    checked={value === true}
                    onCheckedChange={(checked) =>
                      setMarks((prev) => ({
                        ...prev,
                        [student.studentKey]: checked === true,
                      }))
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-base">{student.name}</span>
                    <span className="block text-sm font-bold">
                      {value === undefined
                        ? "Ej markerad"
                        : value
                          ? "Närvarande"
                          : "Frånvarande"}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {student.customerName
                        ? `Kund: ${student.customerName}`
                        : null}
                      {student.customerName && student.remaining ? " · " : null}
                      {student.remaining ? `${student.remaining} kvar` : null}
                      {student.source === "manual"
                        ? " · tillagd för hand"
                        : null}
                      {!student.booked && student.remaining
                        ? " · ej inbokad"
                        : null}
                    </span>
                  </span>
                </label>

                {/* Uteblivna pass återbetalas inte automatiskt — studion
                    bedömer fallet. Knappen finns bara så länge bokningen
                    gör det, så samma tillfälle kan inte lämnas tillbaka
                    två gånger. */}
                {student.status === "ABSENT" && student.booked && (
                  <div className="px-4 pb-3 -mt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={releasing === student.studentKey}
                      onClick={() => void release(student.studentKey)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      {releasing === student.studentKey
                        ? "Lämnar tillbaka..."
                        : "Lämna tillbaka tillfället"}
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t p-3">
        <Button
          type="button"
          className="w-full"
          onClick={save}
          disabled={isSaving || lesson.students.length === 0}
        >
          {isSaving ? "Sparar..." : "Spara närvaro"}
        </Button>
      </div>
    </div>
  );
}
