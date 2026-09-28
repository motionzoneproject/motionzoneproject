import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import type { AttendanceFollowUp as FollowUp } from "@/lib/admin-overview";
import {
  formatDateToInputStr,
  formatShortFriendlyDate,
} from "@/lib/date-utils";
import { dbToFormTime } from "@/lib/time-convert";
import { getCourseName } from "@/lib/tools";
import { AttendanceDialog } from "../../attendance/components/AttendanceDialog";
import { AttendeDialog } from "../../lectures/components/attendence/AttendenceDialog";

const amber = "shrink-0 text-amber-700 dark:text-amber-400";

/** Så många rader syns direkt; resten fälls ihop. */
const VISIBLE = 10;

/**
 * Lektioner den senaste veckan där närvaron och bokningarna inte stämmer.
 *
 * Närvaron rör aldrig bokningarna av sig själv, så här fångar studion det
 * som behöver följas upp — med Närvaro och Bokningar direkt på raden, så att
 * det går att rätta utan att först leta upp lektionen.
 */
export function AttendanceFollowUp({
  items,
  showTeacher = false,
}: {
  items: FollowUp[];
  /** Admin ser hela skolans lektioner, och behöver veta vems det är. */
  showTeacher?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ClipboardList className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          Stäm av närvaro
          <span className="text-sm font-normal text-muted-foreground">
            ({items.length})
          </span>
        </h2>
        <p className="text-sm text-muted-foreground">
          Lektioner senaste veckan där närvaron saknas, eller inte stämmer med
          bokningarna. Bokade som inte kom kan tas bort under Bokningar, så
          tillfället går tillbaka; den som kom utan att ha bokat kan bokas in
          där.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="h-24 animate-pulse rounded-xl border border-border bg-card" />
        }
      >
        <FollowUpList
          items={items.slice(0, VISIBLE)}
          showTeacher={showTeacher}
        />
        {items.length > VISIBLE && (
          // Resten fälls ihop. Första veckan efter att närvaron infördes är
          // ingen lektion avstämd, och då skulle listan annars ta över sidan.
          <details>
            <summary className="cursor-pointer text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
              Visa {items.length - VISIBLE} till
            </summary>
            <div className="mt-2">
              <FollowUpList
                items={items.slice(VISIBLE)}
                showTeacher={showTeacher}
              />
            </div>
          </details>
        )}
      </Suspense>

      <Link
        href={`/admin/attendance?date=${formatDateToInputStr(new Date(items[0].lesson.startTime))}`}
        className="inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Till närvaron
      </Link>
    </section>
  );
}

function FollowUpList({
  items,
  showTeacher,
}: {
  items: FollowUp[];
  showTeacher: boolean;
}) {
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {items.map(({ lesson, notTaken, bookedNotPresent, presentNotBooked }) => (
        <li
          key={lesson.id}
          className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-sm"
        >
          <span className="tabular-nums text-muted-foreground">
            {formatShortFriendlyDate(new Date(lesson.startTime))}{" "}
            {dbToFormTime(new Date(lesson.startTime))}
          </span>
          <span className="font-medium">{getCourseName(lesson.course)}</span>
          {showTeacher && (
            <span className="text-muted-foreground">{lesson.teacher.name}</span>
          )}

          <span className="flex flex-wrap items-center gap-1.5">
            {notTaken && (
              <Badge variant="outline" className={amber}>
                Närvaro ej tagen
              </Badge>
            )}
            {bookedNotPresent > 0 && (
              <Badge variant="outline" className={amber}>
                {bookedNotPresent} bokad{bookedNotPresent === 1 ? "" : "e"} utan
                närvaro
              </Badge>
            )}
            {presentNotBooked > 0 && (
              <Badge variant="outline" className={amber}>
                {presentNotBooked} närvarande utan bokning
              </Badge>
            )}
          </span>

          <span className="ml-auto flex items-center gap-2">
            <AttendanceDialog lessonId={lesson.id} />
            <AttendeDialog lesson={lesson} />
          </span>
        </li>
      ))}
    </ul>
  );
}
