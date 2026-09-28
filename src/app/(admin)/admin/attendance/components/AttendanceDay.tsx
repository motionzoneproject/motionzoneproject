"use client";

import {
  endOfMonth,
  endOfWeek,
  format,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { sv } from "date-fns/locale";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  type AttendanceDayStatus,
  type AttendanceLesson,
  getAttendanceCalendar,
} from "@/lib/actions/attendance-actions";
import { dbToFormTime } from "@/lib/time-convert";
import { attendanceSummary } from "./attendance-summary";
import { LessonAttendance } from "./LessonAttendance";

const toKey = (d: Date) => format(d, "yyyy-MM-dd");
const fromKey = (key: string) => parse(key, "yyyy-MM-dd", new Date());

/**
 * Dagens lektioner med en kryssruta per elev.
 *
 * Närvaro togs tidigare genom att lägga till och ta bort bokningar, en elev
 * i taget i en dialog, vilket drog klipp ur kundens köp vid varje klick. Här
 * är det ett register: kursens elever på en skärm, ett sparande per lektion,
 * och ingenting som rör köpen. Bokningarna nås från varje lektionskort.
 */
export function AttendanceDay({
  date,
  lessons,
  previousDate,
  nextDate,
  heading,
  teachers,
  selectedTeacher,
  bookingDialogs,
}: {
  date: string;
  lessons: AttendanceLesson[];
  previousDate: string;
  nextDate: string;
  heading: { weekday: string; day: string; month: string };
  /** Tomt för lärare, som bara ser sina egna lektioner. */
  teachers: { id: string; name: string }[];
  selectedTeacher: string;
  /** Lektionens bokningsdialog, renderad på servern, per lektion. */
  bookingDialogs: Record<string, ReactNode>;
}) {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const [openLesson, setOpenLesson] = useState<string | null>(
    lessons[0]?.lessonId ?? null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const go = (nextDateKey: string, teacher = selectedTeacher) => {
    const teacherQuery = teacher
      ? `&teacher=${encodeURIComponent(teacher)}`
      : "";
    startNavigation(() => {
      router.push(`/admin/attendance?date=${nextDateKey}${teacherQuery}`);
    });
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16">
      <div className="flex items-center justify-between gap-3 py-6">
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => go(previousDate)}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">Föregående</span>
        </Button>

        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="rounded-lg px-4 py-1 text-center transition-colors hover:bg-muted/60"
              aria-label="Välj datum"
            >
              <span className="block text-sm text-muted-foreground">
                {heading.weekday}
              </span>
              <span className="block text-4xl font-bold leading-none">
                {heading.day}
              </span>
              <span className="flex items-center justify-center gap-1 text-sm font-semibold">
                {heading.month}
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <AttendanceCalendar
              date={date}
              teacher={selectedTeacher}
              refreshKey={lessons}
              onSelect={(key) => {
                setPickerOpen(false);
                go(key);
              }}
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => go(nextDate)}
        >
          <span className="sr-only sm:not-sr-only">Nästa</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {teachers.length > 0 && (
        <div className="mb-6 flex items-center justify-center gap-2">
          <label htmlFor="teacher" className="text-xs text-muted-foreground">
            Lärare
          </label>
          <select
            id="teacher"
            value={selectedTeacher}
            onChange={(e) => go(date, e.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">Alla lärare</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={`transition-opacity ${isNavigating ? "opacity-50" : ""}`}>
        {lessons.length === 0 ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Inga lektioner den här dagen.
          </p>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson) => {
              const isOpen = openLesson === lesson.lessonId;
              const toggle = () =>
                setOpenLesson(isOpen ? null : lesson.lessonId);

              return (
                <div
                  key={lesson.lessonId}
                  className="overflow-hidden rounded-xl border"
                >
                  <div className="flex items-start gap-2 p-4 transition-colors hover:bg-muted/40">
                    <button
                      type="button"
                      onClick={toggle}
                      className="min-w-0 flex-1 text-left"
                    >
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
                        {attendanceSummary(lesson)}
                      </span>
                    </button>

                    <div className="flex shrink-0 items-center gap-1">
                      {bookingDialogs[lesson.lessonId]}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={toggle}
                        aria-label={isOpen ? "Dölj eleverna" : "Visa eleverna"}
                      >
                        <ChevronDown
                          className={`h-5 w-5 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </Button>
                    </div>
                  </div>

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
    </div>
  );
}

/**
 * Datumväljaren, med närvarons läge per dag.
 *
 * Grön ring: närvaron är tagen. Fyllningen säger om den stämmer med
 * bokningarna — grön om den gör det, orange om inte. Röd ring: en lektion
 * som börjat har bokningar men ingen närvaro.
 */
function AttendanceCalendar({
  date,
  teacher,
  refreshKey,
  onSelect,
}: {
  date: string;
  teacher: string;
  /** Ändras när sidan laddats om, så att färgerna hämtas på nytt. */
  refreshKey: unknown;
  onSelect: (key: string) => void;
}) {
  const selected = useMemo(() => fromKey(date), [date]);
  const [month, setMonth] = useState(selected);
  const [statuses, setStatuses] = useState<Record<string, AttendanceDayStatus>>(
    {},
  );

  // Kalendern visar dagar från grannmånaderna också, så hela veckorna hämtas.
  const monthKey = toKey(startOfMonth(month));
  useEffect(() => {
    void refreshKey;
    const start = startOfWeek(startOfMonth(fromKey(monthKey)), {
      weekStartsOn: 1,
    });
    const end = endOfWeek(endOfMonth(fromKey(monthKey)), { weekStartsOn: 1 });
    let cancelled = false;
    getAttendanceCalendar(toKey(start), toKey(end), teacher || undefined).then(
      (result) => {
        if (!cancelled) setStatuses(result);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [monthKey, teacher, refreshKey]);

  const modifiers = useMemo(() => {
    const days = (pick: (s: AttendanceDayStatus) => boolean) =>
      Object.entries(statuses)
        .filter(([, s]) => pick(s))
        .map(([key]) => fromKey(key));
    return {
      ringRed: days((s) => s.ring === "red"),
      ringGreen: days((s) => s.ring === "green"),
      fillGreen: days((s) => s.fill === "green"),
      fillOrange: days((s) => s.fill === "orange"),
    };
  }, [statuses]);

  return (
    <div>
      <Calendar
        mode="single"
        selected={selected}
        onSelect={(d) => d && onSelect(toKey(d))}
        month={month}
        onMonthChange={setMonth}
        locale={sv}
        showWeekNumber
        modifiers={modifiers}
        modifiersClassNames={{
          ringRed:
            "[&>button]:rounded-full [&>button]:ring-2 [&>button]:ring-inset [&>button]:ring-red-500",
          ringGreen:
            "[&>button]:rounded-full [&>button]:ring-2 [&>button]:ring-inset [&>button]:ring-emerald-600",
          fillGreen:
            "[&>button]:rounded-full [&>button]:bg-emerald-500 [&>button]:text-white",
          fillOrange:
            "[&>button]:rounded-full [&>button]:bg-orange-400 [&>button]:text-white",
        }}
      />
      <div className="space-y-1.5 border-t px-4 py-3 text-xs">
        <Legend className="bg-emerald-500 ring-2 ring-inset ring-emerald-600">
          Närvaro tagen, stämmer med bokningarna
        </Legend>
        <Legend className="bg-orange-400 ring-2 ring-inset ring-emerald-600">
          Närvaro tagen, stämmer inte med bokningarna
        </Legend>
        <Legend className="ring-2 ring-inset ring-red-500">
          Bokningar finns, men ingen närvaro är tagen
        </Legend>
      </div>
    </div>
  );
}

function Legend({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3.5 w-3.5 shrink-0 rounded-full ${className}`} />
      <span>{children}</span>
    </div>
  );
}
