import { Sun } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import type { TeacherOverview as TeacherOverviewData } from "@/lib/admin-overview";
import { formatLongFriendlyDate } from "@/lib/date-utils";
import { LessonCarousel } from "../LessonCarousel";
import { CancelledAhead } from "./CancelledAhead";
import { StatTile } from "./StatTile";
import { TodayLessonCard } from "./TodayLessonCard";

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
          // Varje kort hämtar närvarodata för sin lektion, så listan strömmas
          // in i stället för att hålla upp resten av översikten.
          <Suspense fallback={<TodaySkeleton count={data.today.length} />}>
            <div className="grid gap-3 md:grid-cols-2">
              {data.today.map((lesson) => (
                <TodayLessonCard key={lesson.id} lesson={lesson} />
              ))}
            </div>
          </Suspense>
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

/** Platshållare med rätt antal kort, så sidan inte hoppar när de laddats. */
function TodaySkeleton({ count }: { count: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Array.from({ length: count }, (_, index) => index).map((index) => (
        <div
          key={index}
          className="h-36 animate-pulse rounded-xl border border-border bg-card"
        />
      ))}
    </div>
  );
}
