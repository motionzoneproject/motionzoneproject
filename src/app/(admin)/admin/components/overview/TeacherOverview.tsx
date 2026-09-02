import { Clock, MapPin, Sun } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  bookedCount,
  type TeacherOverview as TeacherOverviewData,
} from "@/lib/admin-overview";
import { formatLongFriendlyDate } from "@/lib/date-utils";
import { dbToFormTime } from "@/lib/time-convert";
import { AttendeDialog } from "../../lectures/components/attendence/AttendenceDialog";
import { EditLessonBtn } from "../../lectures/components/EditLesson";
import { LessonCarousel } from "../LessonCarousel";
import { CancelledAhead } from "./CancelledAhead";
import { StatTile } from "./StatTile";

/**
 * Lärarens översikt svarar på "vad gäller för mig idag". Dagens lektioner
 * ligger överst med närvaro och redigering direkt på kortet, så det vanligaste
 * jobbet inte kräver att man scrollar i karusellen först.
 */
export function TeacherOverview({
  data,
  today,
}: {
  data: TeacherOverviewData;
  today: Date;
}) {
  const { stats, own } = data;

  return (
    <>
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Sun className="h-5 w-5 text-muted-foreground" />
            Idag
          </h2>
          <span className="text-sm capitalize text-muted-foreground">
            {formatLongFriendlyDate(today)}
          </span>
        </div>

        {data.today.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Du har inga lektioner idag.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.today.map((lesson) => (
              <Card key={lesson.id} className="border-l-4 border-l-primary">
                <CardContent className="space-y-2 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-base font-semibold leading-tight">
                      {lesson.course.name}
                    </span>
                    {lesson.cancelled && (
                      <Badge
                        variant="outline"
                        className="shrink-0 text-amber-600 dark:text-amber-400"
                      >
                        Inställd
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5 tabular-nums">
                      <Clock className="h-4 w-4" />
                      {dbToFormTime(new Date(lesson.startTime))}–
                      {dbToFormTime(new Date(lesson.endTime))}
                    </span>
                    {lesson.schemaItem.studio && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        {lesson.schemaItem.studio.name}
                      </span>
                    )}
                    <span className="tabular-nums">
                      {bookedCount(lesson)} bokade
                    </span>
                  </div>

                  {lesson.message && (
                    <p className="text-sm text-muted-foreground">
                      {lesson.message}
                    </p>
                  )}
                </CardContent>

                <CardFooter className="flex items-center gap-4 border-t pt-3 text-xs">
                  <AttendeDialog lesson={lesson} />
                  <EditLessonBtn lesson={lesson} />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <StatTile
          label="Dina lektioner"
          value={stats.lessonsAhead}
          hint="kommande 7 dagar"
        />
        <StatTile
          label="Bokningar"
          value={stats.bookingsAhead}
          hint="på dessa lektioner"
        />
      </section>

      <CancelledAhead lessons={data.cancelledAhead} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          <strong>Dina</strong> senaste och kommande lektioner
        </h2>
        <div className="rounded-xl bg-muted/30 p-1">
          <LessonCarousel
            lessons={own.lessons}
            initialScrollIndex={own.initialScrollIndex}
          />
        </div>
        <Link
          href="/admin/lectures"
          className="inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Till alla dina lektioner
        </Link>
      </section>
    </>
  );
}
