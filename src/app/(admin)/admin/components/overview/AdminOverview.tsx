import { CalendarDays, CircleAlert, Wallet } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getHealthCheckInfo } from "@/lib/admin-health";
import type { AdminOverview as AdminOverviewData } from "@/lib/admin-overview";
import { formatLongFriendlyDate } from "@/lib/date-utils";
import { formatPrice } from "@/lib/money";
import { LessonCarousel } from "../LessonCarousel";
import { CancelledAhead } from "./CancelledAhead";
import { HealthChecks } from "./HealthChecks";
import { StatTile } from "./StatTile";
import { TodayLessonCard } from "./TodayLessonCard";

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

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
          // Varje kort hämtar närvarodata för sin lektion, så listan strömmas
          // in i stället för att hålla upp resten av översikten.
          <Suspense
            fallback={<TodayScheduleSkeleton count={data.today.length} />}
          >
            <div className="grid gap-3 md:grid-cols-2">
              {data.today.map((lesson) => (
                <TodayLessonCard key={lesson.id} lesson={lesson} showTeacher />
              ))}
            </div>
          </Suspense>
        )}

        <Link
          href="/admin/lectures"
          className="inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Till alla lektioner
        </Link>
      </section>

      <CancelledAhead lessons={data.cancelledAhead} showTeacher />

      {/* Kontrollerna körs på knapptryck, inte vid sidladdning — det är ett
          tjugotal frågor och man letar fel ibland, inte varje gång. */}
      <HealthChecks info={getHealthCheckInfo()} />

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
    </>
  );
}

/** Platshållare med rätt antal kort, så sidan inte hoppar när de laddats. */
function TodayScheduleSkeleton({ count }: { count: number }) {
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
