"use client";

import { sv } from "date-fns/locale";
import { useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Course, Lesson } from "@/generated/prisma/client";
import LessonAttendanceForm from "./courses/components/LessonAttendanceForm";
import LessonItemForm from "./courses/components/LessonItemForm";

type LessonWithCourse = Lesson & { course: Course };

interface Props {
  lessons: LessonWithCourse[];
  teachers: { id: string; name: string }[];
  terms: { id: string; name: string }[];
  courses: { id: string; name: string }[];
  currentUserId: string;
  initDate?: Date;
}

export default function AdminLessonCal({
  lessons,
  teachers,
  terms,
  courses,
  currentUserId,
  initDate,
}: Props) {
  const [date, setDate] = useState<Date | undefined>(initDate ?? new Date());
  const [teacherId, setTeacherId] = useState<string>(currentUserId);
  const [termId, setTermId] = useState<string>("all");
  const [courseId, setCourseId] = useState<string>("all");

  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      const matchesTeacher =
        teacherId === "all" ? true : lesson.teacherId === teacherId;
      const matchesTerm = termId === "all" ? true : lesson.terminId === termId;
      const matchesCourse =
        courseId === "all" ? true : lesson.courseId === courseId;

      return matchesTeacher && matchesTerm && matchesCourse;
    });
  }, [lessons, teacherId, termId, courseId]);

  const lessonDays = useMemo(
    () => filteredLessons.map((l) => new Date(l.startTime)),
    [filteredLessons],
  );
  const cancelledDays = useMemo(
    () =>
      filteredLessons
        .filter((l) => l.cancelled)
        .map((l) => new Date(l.startTime)),
    [filteredLessons],
  );

  const selectedDateLessons = useMemo(() => {
    if (!date) return [];
    return filteredLessons.filter(
      (l) => new Date(l.startTime).toDateString() === date.toDateString(),
    );
  }, [date, filteredLessons]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Lärare</p>
            <Select
              value={teacherId}
              onValueChange={(val) => setTeacherId(val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Välj lärare" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla lärare</SelectItem>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Termin</p>
            <Select value={termId} onValueChange={(val) => setTermId(val)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Välj termin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla terminer</SelectItem>
                {terms.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Kurs</p>
            <Select value={courseId} onValueChange={(val) => setCourseId(val)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Välj kurs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla kurser</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex-none">
          <div className="flex-none w-full sm:w-auto">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              showWeekNumber
              locale={sv}
              className="rounded-lg border shadow w-full sm:w-auto"
              modifiers={{
                hasLesson: lessonDays,
                cancelled: cancelledDays,
              }}
              modifiersStyles={{
                hasLesson: {
                  border: "2px solid #22c55e",
                  borderRadius: "50%",
                },
                cancelled: {
                  backgroundColor: "#ef4444",
                  color: "white",
                  borderRadius: "50%",
                },
              }}
            />
          </div>
          <div className="mt-4 flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full border border-foreground/40" />
              <span>Lektioner finns</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-destructive" />
              <span>Inställd lektion</span>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {date
                  ? date.toLocaleDateString("sv-SE", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })
                  : "Välj ett datum"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedDateLessons.length > 0 ? (
                selectedDateLessons.map((lesson) => {
                  const startTime = new Date(lesson.startTime);
                  const endTime = new Date(lesson.endTime);

                  return (
                    <div
                      key={lesson.id}
                      className="border rounded-lg p-4 bg-muted/20"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">
                            {startTime.toLocaleTimeString("sv-SE", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {" - "}
                            {endTime.toLocaleTimeString("sv-SE", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {lesson.course.name}{" "}
                            {lesson.cancelled && (
                              <span className="font-bold text-destructive">
                                (INSTÄLLD)
                              </span>
                            )}
                            {lesson.message && (
                              <>
                                <br />
                                {lesson.message}
                              </>
                            )}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <LessonAttendanceForm lesson={lesson} refreshOnOpen />
                        </div>
                      </div>
                      <Accordion type="single" collapsible className="mt-3">
                        <AccordionItem value={`lesson-${lesson.id}`}>
                          <AccordionTrigger>Hantera</AccordionTrigger>
                          <AccordionContent>
                            <LessonItemForm lesson={lesson} />
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  );
                })
              ) : (
                <p className="text-muted-foreground">
                  Inga lektioner planerade denna dag.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
