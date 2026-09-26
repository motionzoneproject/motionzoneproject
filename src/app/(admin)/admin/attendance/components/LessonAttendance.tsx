"use client";

import { CheckCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  type AttendanceLesson,
  type AttendanceStudent,
  saveAttendance,
} from "@/lib/actions/attendance-actions";
import { CourseRosterDialog } from "../../components/CourseRosterDialog";

function studentDetails(student: AttendanceStudent): string {
  return [
    student.customerName ? `Kund: ${student.customerName}` : null,
    student.remaining !== null ? `${student.remaining} kvar` : null,
    student.addedManually ? "tillagd för hand" : null,
    !student.inCourse ? "inte längre i kursen" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * En lektions elevlista med en kryssruta var.
 *
 * Listan är kursens elever — samma som "Hantera elever". Används både på
 * närvarosidan och i dialogen som öppnas från översikten och lektionslistan.
 *
 * Rör varken bokningar eller klipp. Närvaron är ett eget register; vilka
 * bokningar som saknar närvaro syns i stället i lektionens bokningar.
 */
export function LessonAttendance({
  lesson,
  onChanged,
}: {
  lesson: AttendanceLesson;
  /** Körs när något sparats eller listan kan ha ändrats. */
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [marks, setMarks] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const student of lesson.students) {
      if (student.status !== null) {
        initial[student.studentKey] = student.status === "PRESENT";
      }
    }
    return initial;
  });

  const refresh = () => {
    onChanged?.();
    router.refresh();
  };

  const markAllPresent = () => {
    const next: Record<string, boolean> = {};
    for (const student of lesson.students) next[student.studentKey] = true;
    setMarks(next);
  };

  const save = async () => {
    setIsSaving(true);
    try {
      const saved = lesson.students.map((student) => ({
        studentKey: student.studentKey,
        present: marks[student.studentKey] === true,
      }));
      const res = await saveAttendance(lesson.lessonId, saved);
      if (res.success) {
        // Den som inte bockats i sparas som frånvarande, och ska visas så.
        setMarks(
          Object.fromEntries(saved.map((m) => [m.studentKey, m.present])),
        );
        toast.success(res.msg);
        refresh();
      } else {
        toast.error(res.msg);
      }
    } finally {
      setIsSaving(false);
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

        <CourseRosterDialog
          courseId={lesson.courseId}
          onClosed={onChanged}
          trigger={
            <Button type="button" variant="ghost" size="sm">
              <Users className="h-4 w-4" />
              Hantera elever på kursen
            </Button>
          }
        />
      </div>

      {lesson.students.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          Ingen går kursen ännu. Lägg till elever under &ldquo;Hantera elever på
          kursen&rdquo;.
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
                      {studentDetails(student)}
                    </span>
                  </span>
                </label>
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
