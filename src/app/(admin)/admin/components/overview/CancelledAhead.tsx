import { CalendarX2 } from "lucide-react";
import Link from "next/link";
import type { LessonWithData } from "@/lib/admin-overview";
import { formatShortFriendlyDate } from "@/lib/date-utils";
import { dbToFormTime } from "@/lib/time-convert";

interface CancelledAheadProps {
  lessons: LessonWithData[];
  /** Admin ser hela skolans, och behöver då veta vems lektion det är. */
  showTeacher?: boolean;
}

/**
 * Inställda lektioner framåt — alltså det kunderna ser som inställt just nu.
 */
export function CancelledAhead({
  lessons,
  showTeacher = false,
}: CancelledAheadProps) {
  if (lessons.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <CalendarX2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        Inställda framåt
        <span className="text-sm font-normal text-muted-foreground">
          ({lessons.length})
        </span>
      </h2>

      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {lessons.map((lesson) => (
          <li
            key={lesson.id}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-sm"
          >
            <span className="text-muted-foreground tabular-nums">
              {formatShortFriendlyDate(new Date(lesson.startTime))}{" "}
              {dbToFormTime(new Date(lesson.startTime))}
            </span>
            <span className="font-medium">{lesson.course.name}</span>
            {showTeacher && (
              <span className="text-muted-foreground">
                {lesson.teacher.name}
              </span>
            )}
            {lesson.message && (
              <span className="w-full text-muted-foreground sm:w-auto">
                &ldquo;{lesson.message}&rdquo;
              </span>
            )}
          </li>
        ))}
      </ul>

      <Link
        href="/admin/lectures?status=cancelled"
        className="inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Visa alla inställda
      </Link>
    </section>
  );
}
