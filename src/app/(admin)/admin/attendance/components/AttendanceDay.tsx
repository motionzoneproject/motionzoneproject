"use client";

import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AttendanceLesson } from "@/lib/actions/attendance-actions";
import { dbToFormTime } from "@/lib/time-convert";
import { LessonAttendance } from "./LessonAttendance";

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
  teachers,
  selectedTeacher,
}: {
  date: string;
  lessons: AttendanceLesson[];
  previousDate: string;
  nextDate: string;
  heading: { weekday: string; day: string; month: string };
  /** Tomt för lärare, som bara ser sina egna lektioner. */
  teachers: { id: string; name: string }[];
  selectedTeacher: string;
}) {
  const [openLesson, setOpenLesson] = useState<string | null>(
    lessons[0]?.lessonId ?? null,
  );

  const teacherQuery = selectedTeacher
    ? `&teacher=${encodeURIComponent(selectedTeacher)}`
    : "";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16">
      <div className="flex items-center justify-between gap-3 py-6">
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href={`/admin/attendance?date=${previousDate}${teacherQuery}`}>
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
          <Link href={`/admin/attendance?date=${nextDate}${teacherQuery}`}>
            <CalendarDays className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Nästa datum</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <form
        method="GET"
        className="mb-6 flex flex-wrap items-center justify-center gap-2"
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

        {teachers.length > 0 && (
          <>
            <label htmlFor="teacher" className="text-xs text-muted-foreground">
              Lärare
            </label>
            <select
              id="teacher"
              name="teacher"
              defaultValue={selectedTeacher}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">Alla lärare</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </>
        )}

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
              (s) => s.status !== null,
            ).length;
            const present = lesson.students.filter(
              (s) => s.status === "PRESENT",
            ).length;

            return (
              <div
                key={lesson.lessonId}
                className="overflow-hidden rounded-xl border"
              >
                <button
                  type="button"
                  onClick={() => setOpenLesson(isOpen ? null : lesson.lessonId)}
                  className="flex w-full items-start justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/40"
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
                    <span className="block text-sm text-muted-foreground">
                      {[
                        lesson.studioName,
                        teachers.length > 0 && !selectedTeacher
                          ? lesson.teacherName
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
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
                    <LessonAttendance lesson={lesson} />
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
