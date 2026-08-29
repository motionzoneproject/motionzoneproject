"use client";

import { t } from "i18next";
import { Calendar, ChevronDown, ChevronUp, History, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDateToInputStr } from "@/lib/date-utils";
import { dbToFormTime } from "@/lib/time-convert";
import { DelBookBtn } from "./DelBookBtn";

type BookingForList = {
  id: string;
  purchaseItemId: string;
  lessonId: string;
  lesson: { startTime: Date; endTime: Date };
};

interface Props {
  bookings: BookingForList[];
  labelYourBookings: string;
  labelNoBookings: string;
  initialCount?: number;
}
function BookingGrid({
  bookings,
  openBookingId,
  setOpenBookingId,
  isPastGrid,
}: {
  bookings: BookingForList[];
  openBookingId: string | null;
  setOpenBookingId: (id: string | null) => void;
  isPastGrid: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {bookings.map((b) => {
        const isOpen = openBookingId === b.id;

        return (
          <div
            key={b.id}
            className={`relative flex flex-col justify-between rounded-lg border p-3 text-sm transition-all ${
              isOpen
                ? "min-h-20 border-brand bg-muted/40 ring-1 ring-brand"
                : ""
            } ${
              !isOpen &&
              (isPastGrid
                ? "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/60"
                : "border-border bg-background text-foreground hover:border-brand/50")
            }`}
          >
            <Button
              type="button"
              variant="ghost"
              aria-label={
                isOpen
                  ? "Stäng bokning"
                  : `Visa detaljer för bokning ${formatDateToInputStr(
                      b.lesson.startTime,
                    )}`
              }
              aria-expanded={isOpen}
              onClick={() => setOpenBookingId(isOpen ? null : b.id)}
              className="absolute inset-0 z-0 h-full w-full rounded-lg p-0 hover:bg-transparent"
            >
              <span className="sr-only">
                {isOpen ? "Stäng bokning" : "Öppna bokning"}
              </span>
            </Button>

            <div className="relative z-10 pointer-events-none flex min-w-0 items-start gap-1.5">
              <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />

              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate">
                  {formatDateToInputStr(b.lesson.startTime)}
                </span>

                {isOpen && (
                  <span className="mt-1 text-sm font-medium">
                    {dbToFormTime(b.lesson.startTime)} -{" "}
                    {dbToFormTime(b.lesson.endTime)}
                  </span>
                )}
              </div>
            </div>

            {isOpen && (
              <div className="relative z-20 mt-3 flex items-center justify-end gap-1 border-t border-border/50 pt-2.5">
                {!isPastGrid && (
                  <DelBookBtn pId={b.purchaseItemId} lId={b.lessonId} />
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setOpenBookingId(null)}
                >
                  <X className="h-3.5 w-3.5" />
                  <span className="sr-only">Stäng bokning</span>
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PurchaseItemBookings({
  bookings,
  labelYourBookings,
  labelNoBookings,
  initialCount = 6,
}: Props) {
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [openBookingId, setOpenBookingId] = useState<string | null>(null);

  if (bookings.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">{labelNoBookings}</p>
    );
  }

  const now = Date.now();
  const upcoming = bookings.filter((b) => b.lesson.startTime.getTime() >= now);
  const past = bookings.filter((b) => b.lesson.startTime.getTime() < now);

  const visibleUpcoming = upcomingExpanded
    ? upcoming
    : upcoming.slice(0, initialCount);
  const hiddenUpcomingCount = upcoming.length - visibleUpcoming.length;

  // Om man klickar på en gammal bokning ska den öppnas i sin egen grid, inte upcoming.
  const setOpenBooking = (id: string | null) => setOpenBookingId(id);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-muted-foreground text-xs mb-2">
          {labelYourBookings} ({upcoming.length}st)
        </p>

        {upcoming.length > 0 ? (
          <BookingGrid
            bookings={visibleUpcoming}
            openBookingId={openBookingId}
            setOpenBookingId={setOpenBooking}
            isPastGrid={false}
          />
        ) : (
          <p className="text-xs text-muted-foreground italic">
            {labelNoBookings}
          </p>
        )}

        {upcoming.length > initialCount && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setUpcomingExpanded((v) => !v);
              setOpenBookingId(null);
            }}
            className="mt-2 h-9 w-full gap-1.5 border border-border font-medium sm:w-auto"
          >
            {upcomingExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />{" "}
                {t("user.orderHistory.showLess")}
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />{" "}
                {t("user.orderHistory.showMore", {
                  count: hiddenUpcomingCount,
                })}
              </>
            )}
          </Button>
        )}
      </div>

      {past.length > 0 && (
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-xs text-muted-foreground"
            onClick={() => {
              setShowPast((v) => !v);
              setOpenBookingId(null);
            }}
          >
            <History className="h-3.5 w-3.5" />
            {showPast ? "Dölj" : "Visa"} tidigare bokningar ({past.length}st)
            {showPast ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>

          {showPast && (
            <div className="mt-2">
              <BookingGrid
                bookings={past}
                openBookingId={openBookingId}
                setOpenBookingId={setOpenBooking}
                isPastGrid={true}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
