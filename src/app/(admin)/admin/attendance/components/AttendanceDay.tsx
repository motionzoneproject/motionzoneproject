"use client";

import {
  CalendarDays,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  type AttendanceLesson,
  saveAttendance,
} from "@/lib/actions/attendance-actions";
import { dbToFormTime } from "@/lib/time-convert";
import { ManageRosterDialog } from "./ManageRosterDialog";

/**
 * Dagens lektioner med en kryssruta per elev.
 *
 * Närvaro togs tidigare genom att lägga till och ta bort bokningar, en elev
 * i taget i en dialog, vilket drog klipp ur kundens köp vid varje klick. Här
 * är det ett register: hela gruppen på en skärm, ett sparande per lektion,
 * och ingenting som rör köpen.
 */
export function AttendanceDay({
  date,
  lessons,
  previousDate,
  nextDate,
  heading,
}: {
  date: string;
  lessons: AttendanceLesson[];
  previousDate: string;
  nextDate: string;
  heading: { weekday: string; day: string; month: string };
}) {
  const router = useRouter();
  const [openLesson, setOpenLesson] = useState<string | null>(
    lessons[0]?.lessonId ?? null,
  );
  const [marks, setMarks] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const lesson of lessons) {
      for (const student of lesson.students) {
        if (student.status !== null) {
          initial[`${lesson.lessonId}:${student.studentKey}`] =
            student.status === "PRESENT";
        }
      }
    }
    return initial;
  });
  const [savingLesson, setSavingLesson] = useState<string | null>(null);

  const markKey = (lessonId: string, studentKey: string) =>
    `${lessonId}:${studentKey}`;

  const setMark = (lessonId: string, studentKey: string, present: boolean) => {
    setMarks((prev) => ({ ...prev, [markKey(lessonId, studentKey)]: present }));
  };

  const markAllPresent = (lesson: AttendanceLesson) => {
    setMarks((prev) => {
      const next = { ...prev };
      for (const student of lesson.students) {
        next[markKey(lesson.lessonId, student.studentKey)] = true;
      }
      return next;
    });
  };

  const save = async (lesson: AttendanceLesson) => {
    setSavingLesson(lesson.lessonId);
    try {
      const payload = lesson.students.map((student) => ({
        studentKey: student.studentKey,
        present: marks[markKey(lesson.lessonId, student.studentKey)] === true,
      }));

      const res = await saveAttendance(lesson.lessonId, payload);
      if (res.success) {
        toast.success(res.msg);
        router.refresh();
      } else {
        toast.error(res.msg);
      }
    } finally {
      setSavingLesson(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16">
      <div className="flex items-center justify-between gap-3 py-6">
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href={`/admin/attendance?date=${previousDate}`}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Föregående</span>
          </Link>
        </Button>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">{heading.weekday}</p>
          <p className="text-4xl font-bold leading-none">{heading.day}</p>
          <p className="text-sm font-semibold">{heading.month}</p>
        </div>

        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href={`/admin/attendance?date=${nextDate}`}>
            <CalendarDays className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Nästa datum</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <form
        method="GET"
        className="mb-6 flex items-center justify-center gap-2"
      >
        <label htmlFor="date" className="text-xs text-muted-foreground">
          Gå till datum
        </label>
        <input
          id="date"
          name="date"
          type="date"
          defaultValue={date}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        />
        <Button type="submit" variant="ghost" size="sm">
          Visa
        </Button>
      </form>

      {lessons.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Inga lektioner den här dagen.
        </p>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson) => {
            const isOpen = openLesson === lesson.lessonId;
            const marked = lesson.students.filter(
              (s) =>
                marks[markKey(lesson.lessonId, s.studentKey)] !== undefined,
            ).length;
            const present = lesson.students.filter(
              (s) => marks[markKey(lesson.lessonId, s.studentKey)] === true,
            ).length;

            return (
              <div
                key={lesson.lessonId}
                className="overflow-hidden rounded-xl border"
              >
                <button
                  type="button"
                  onClick={() => setOpenLesson(isOpen ? null : lesson.lessonId)}
                  className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block text-lg font-bold leading-tight">
                      {lesson.courseName}
                      {lesson.cancelled && (
                        <span className="ml-2 text-xs font-medium uppercase text-destructive">
                          Inställd
                        </span>
                      )}
                    </span>
                    {lesson.studioName && (
                      <span className="block text-sm text-muted-foreground">
                        {lesson.studioName}
                      </span>
                    )}
                    <span className="block text-sm text-muted-foreground">
                      {dbToFormTime(lesson.startTime)} -{" "}
                      {dbToFormTime(lesson.endTime)}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {lesson.students.length} elever
                      {marked > 0
                        ? ` · ${present} närvarande av ${marked} markerade`
                        : " · inte markerad"}
                    </span>
                  </span>

                  <ChevronDown
                    className={`h-5 w-5 shrink-0 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="border-t">
                    <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 p-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => markAllPresent(lesson)}
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
                        Inga elever i listan. Lägg till dem under &ldquo;Hantera
                        elever&rdquo;.
                      </p>
                    ) : (
                      <ul className="divide-y">
                        {lesson.students.map((student) => {
                          const key = markKey(
                            lesson.lessonId,
                            student.studentKey,
                          );
                          const value = marks[key];

                          return (
                            <li key={student.studentKey}>
                              <label
                                htmlFor={key}
                                className="flex cursor-pointer items-center gap-4 p-4 hover:bg-muted/40 transition-colors"
                              >
                                <Checkbox
                                  id={key}
                                  className="h-6 w-6"
                                  checked={value === true}
                                  onCheckedChange={(checked) =>
                                    setMark(
                                      lesson.lessonId,
                                      student.studentKey,
                                      checked === true,
                                    )
                                  }
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block text-base">
                                    {student.name}
                                  </span>
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
                                    {student.customerName && student.remaining
                                      ? " · "
                                      : null}
                                    {student.remaining
                                      ? `${student.remaining} kvar`
                                      : null}
                                    {student.source === "manual"
                                      ? " · tillagd för hand"
                                      : null}
                                    {!student.booked && student.remaining
                                      ? " · ej inbokad"
                                      : null}
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
                        onClick={() => save(lesson)}
                        disabled={
                          savingLesson === lesson.lessonId ||
                          lesson.students.length === 0
                        }
                      >
                        {savingLesson === lesson.lessonId
                          ? "Sparar..."
                          : "Spara närvaro"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
