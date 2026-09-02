import { CalendarDays, CircleAlert, Clock, MapPin, Wallet } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  type AdminOverview as AdminOverviewData,
  bookedCount,
} from "@/lib/admin-overview";
import { formatLongFriendlyDate } from "@/lib/date-utils";
import { formatPrice } from "@/lib/money";
import { dbToFormTime } from "@/lib/time-convert";
import { LessonCarousel } from "../LessonCarousel";
import { CancelledAhead } from "./CancelledAhead";
import { StatTile } from "./StatTile";

/**
 * Adminens översikt svarar på "hur ligger skolan till just nu, och vad kräver
 * min åtgärd". Lärarens egna lektioner är sekundära här och ligger sist.
 */
export function AdminOverview({
  data,
  today,
}: {
  data: AdminOverviewData;
  today: Date;
}) {
  const { actions, stats, own } = data;
  const hasActions = actions.awaitingApproval > 0 || actions.unpaid > 0;

  return (
    <>
      {hasActions && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Att göra</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {actions.awaitingApproval > 0 && (
              <Link
                href="/admin/orders?status=PENDING"
                className="flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 transition-colors hover:bg-amber-500/10"
              >
                <CircleAlert className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <div className="font-semibold">
                    {actions.awaitingApproval} ordrar väntar på godkännande
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Granska och bevilja
                  </div>
                </div>
              </Link>
            )}

            {actions.unpaid > 0 && (
              <Link
                href="/admin/orders"
                className="flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 transition-colors hover:bg-amber-500/10"
              >
                <Wallet className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <div className="font-semibold">
                    {actions.unpaid} obetalda ordrar
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Ej makulerade
                  </div>
                </div>
              </Link>
            )}
          </div>
        </section>
      )}

      <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Lektioner"
          value={stats.lessonsAhead}
          hint="kommande 7 dagar"
        />
        <StatTile
          label="Bokningar"
          value={stats.bookingsAhead}
          hint="på dessa lektioner"
        />
        <StatTile
          label="Nya ordrar"
          value={stats.ordersLastWeek}
          hint="senaste 7 dagarna"
        />
        <StatTile
          label="Utestående"
          value={formatPrice(stats.unpaidTotal)}
          hint="obetalda ordrar"
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            Idag på schemat
          </h2>
          <span className="text-sm capitalize text-muted-foreground">
            {formatLongFriendlyDate(today)}
          </span>
        </div>

        {data.today.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Inga lektioner ligger inbokade idag.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {data.today.map((lesson) => (
              <li
                key={lesson.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm"
              >
                <span className="flex items-center gap-1.5 tabular-nums text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {dbToFormTime(new Date(lesson.startTime))}–
                  {dbToFormTime(new Date(lesson.endTime))}
                </span>
                <span className="font-medium">{lesson.course.name}</span>
                {lesson.schemaItem.studio && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {lesson.schemaItem.studio.name}
                  </span>
                )}
                <span className="text-muted-foreground">
                  {lesson.teacher.name}
                </span>
                <span className="ml-auto flex items-center gap-2">
                  {lesson.cancelled && (
                    <Badge
                      variant="outline"
                      className="text-amber-600 dark:text-amber-400"
                    >
                      Inställd
                    </Badge>
                  )}
                  <span className="tabular-nums text-muted-foreground">
                    {bookedCount(lesson)} bokade
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/admin/lectures"
          className="inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Till alla lektioner
        </Link>
      </section>

      <CancelledAhead lessons={data.cancelledAhead} showTeacher />

      {own.lessons.length > 0 && (
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
        </section>
      )}
    </>
  );
}
