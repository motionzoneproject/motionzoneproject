"use client";

import { enGB, sv } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
} from "@/components/ui/item";
import {
  calcRemainingCount,
  hasRemainingCount,
} from "@/lib/actions/purchase-helpers";
import {
  type BookingWithLesson,
  delBooking,
  type LessonWithCourse,
  type UserPurchaseWithProduct,
} from "@/lib/actions/server-actions";
import {
  formatDateToInputStr,
  formatFriendlyDate,
  formatFriendlyDateTime,
} from "@/lib/date-utils";
import { pick } from "@/lib/i18n/pick";
import type { AppLang } from "@/locales/config-lang";
import { normalizeLang } from "@/locales/config-lang";
import BookBtn from "./BookBtn";

interface Props {
  lessons: LessonWithCourse[]; // Alla lektioner i alla kurser som kunden har tillgång till.
  bookings: BookingWithLesson[]; // Alla bokningar gjorda av kunden.
  purchaseItems: UserPurchaseWithProduct[]; // Alla produkter (purchaseItems) som tillhör kunden, med info om vilka kurser kunden kan boka med en viss produkt.
  initDate?: Date;
}

export default function BookingCal({
  lessons,
  bookings,
  purchaseItems,
  initDate,
}: Props) {
  const { t, i18n } = useTranslation();
  const lang: AppLang = normalizeLang(i18n.language);
  const dateLocale = lang === "en" ? "en-GB" : "sv-SE";
  const calendarLocale = lang === "en" ? enGB : sv;
  const [date, setDate] = useState<Date | undefined>(initDate ?? new Date());

  const bookedDays = useMemo(
    () =>
      bookings
        .filter((b) => !b.cancelled)
        .map((b) => new Date(b.lesson.startTime)),
    [bookings],
  );

  const availableDays = useMemo(() => {
    const now = Date.now();
    return lessons
      .filter((lesson) => {
        if (lesson.cancelled || lesson.startTime.getTime() < now) return false;

        const lessonPurchaseItems = purchaseItems.filter(
          (itm) => itm.courseId === lesson.courseId,
        );

        const bookingsOnLesson = bookings.filter(
          (b) => b.lessonId === lesson.id && !b.cancelled,
        );

        const bookedParticipantIds = new Set<string>();
        let ownerAlreadyBooked = false;

        for (const b of bookingsOnLesson) {
          const bookingPurchaseItem = lessonPurchaseItems.find(
            (itm) => itm.id === b.purchaseItemId,
          );

          if (!bookingPurchaseItem) continue;

          const participantId = bookingPurchaseItem?.purchase.participant?.id;

          if (participantId) {
            bookedParticipantIds.add(participantId);
          } else {
            ownerAlreadyBooked = true;
          }
        }

        // Finns det NÅGOT som går att boka?
        for (const itm of lessonPurchaseItems) {
          const remaining = calcRemainingCount({
            purchase: itm.purchase,
            purchaseItem: itm,
          });

          if (!hasRemainingCount(remaining)) continue;

          const participantId = itm.purchase.participant?.id;

          if (participantId) {
            if (bookedParticipantIds.has(participantId)) continue;
          } else {
            if (ownerAlreadyBooked) continue;
          }

          return true; // 🔥 minst en bokningsbar plats
        }

        return false;
      })
      .map((l) => new Date(l.startTime));
  }, [lessons, purchaseItems, bookings]);

  const cancelledDays = useMemo(
    () => lessons.filter((l) => l.cancelled).map((l) => new Date(l.startTime)),
    [lessons],
  );

  // 2. Hitta lektioner för den valda dagen
  const selectedDateLessons = useMemo(() => {
    if (!date) return [];
    const selectedDateStr = formatDateToInputStr(date);
    return lessons.filter(
      (l) => formatDateToInputStr(l.startTime) === selectedDateStr,
    );
  }, [date, lessons]);

  const now = Date.now();

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <div className="flex-none">
        <div className="flex-none w-full sm:w-auto">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            showWeekNumber
            locale={calendarLocale}
            className="rounded-lg border shadow w-full sm:w-auto"
            modifiers={{
              isBooked: bookedDays,
              cancelled: cancelledDays,
              isAvailable: availableDays,
            }}
            modifiersStyles={{
              isBooked: {
                backgroundColor: "#3b82f6",
                color: "white",
                borderRadius: "50%",
              },
              isAvailable: {
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
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span>{t("user.booking.legendBooked")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full border-2 border-green-500" />
            <span>{t("user.booking.legendAvailable")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span>{t("user.booking.legendCancelled")}</span>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {date
                ? formatFriendlyDate(date, dateLocale)
                : t("user.booking.selectDate")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedDateLessons.length > 0 ? (
              // mappa lektionerna för det valda datumet.
              selectedDateLessons.map((lesson) => {
                // Samla purchaseItems som kunden äger för den lektionen
                const lessonPurchaseItems = purchaseItems.filter(
                  (itm) => itm.courseId === lesson.courseId,
                );

                // Hämta bokningar gjorda för lektionen.
                const bookingsOnLesson = bookings.filter(
                  (b) => b.lessonId === lesson.id && !b.cancelled,
                );

                // Samla vilka deltagare som redan är bokade på just denna lektion.
                const bookedParticipantIds = new Set<string>();
                let ownerAlreadyBooked = false;

                // Kolla varje bokning och markera om det är en participant eller owner.
                for (const b of bookingsOnLesson) {
                  const bookingPurchaseItem = lessonPurchaseItems.find(
                    (itm) => itm.id === b.purchaseItemId,
                  );

                  if (!bookingPurchaseItem) continue;

                  const participantId =
                    bookingPurchaseItem.purchase.participant?.id;

                  if (participantId) {
                    bookedParticipantIds.add(participantId);
                  } else {
                    ownerAlreadyBooked = true;
                  }
                }

                // Bygg listan över vad som går att boka nu.
                const availablePurchaseItems: UserPurchaseWithProduct[] = [];

                for (const itm of lessonPurchaseItems) {
                  // Endast med klipp kvar:
                  const remaining = calcRemainingCount({
                    purchase: itm.purchase,
                    purchaseItem: itm,
                  });
                  if (!hasRemainingCount(remaining)) continue;

                  const participantId = itm.purchase.participant?.id;

                  if (participantId) {
                    if (bookedParticipantIds.has(participantId)) continue;
                  } else {
                    if (ownerAlreadyBooked) continue;
                  }

                  availablePurchaseItems.push(itm);
                }

                // Nu kan vi avgöra:
                const hasAnyBooking = bookingsOnLesson.length > 0;
                const canBookMore = availablePurchaseItems.length > 0;
                const isPastLesson = lesson.startTime.getTime() < now;
                const shouldShowLesson =
                  lesson.cancelled ||
                  hasAnyBooking ||
                  (!isPastLesson && canBookMore);

                // För att hämta data att visa:
                const purchaseItemById = new Map(
                  lessonPurchaseItems.map((itm) => [itm.id, itm]),
                );

                if (!shouldShowLesson) return null;

                return (
                  <div
                    key={lesson.id}
                    className="flex items-start justify-between border-b pb-4 last:border-0"
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="font-semibold">
                        {formatFriendlyDateTime(lesson.startTime, dateLocale)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {pick(lesson.course, "name", lang) as string}{" "}
                        {lesson.cancelled && (
                          <span className="font-bold text-red-500">
                            {t("user.booking.cancelled")}
                          </span>
                        )}
                        <br />
                        {pick(lesson, "message", lang) as string}
                      </p>
                      {hasAnyBooking && (
                        <div className="mt-2 space-y-1.5 w-full">
                          <p className="text-xs font-medium text-muted-foreground">
                            {t("user.booking.yourBookings")}
                          </p>
                          {bookingsOnLesson.map((b) => {
                            const bookedItem = purchaseItemById.get(
                              b.purchaseItemId,
                            );
                            if (!bookedItem) return null;

                            const participantName =
                              bookedItem.purchase.participant?.name ??
                              t("user.booking.yourselfShort");
                            const productName = pick(
                              bookedItem.purchase.product,
                              "name",
                              lang,
                            ) as string;

                            return (
                              <Item
                                key={b.id}
                                variant="muted"
                                size="sm"
                                className="w-full"
                              >
                                <ItemContent>
                                  <ItemDescription className="text-xs">
                                    {participantName} ({productName})
                                  </ItemDescription>
                                </ItemContent>
                                <ItemActions>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() =>
                                      delBooking(lesson.id, b.purchaseItemId)
                                    }
                                    title={t("user.booking.cancelTitle")}
                                    disabled={
                                      lesson.cancelled ||
                                      lesson.startTime.getTime() < Date.now()
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </ItemActions>
                              </Item>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {lesson.cancelled ? (
                      t("user.booking.cancelledShort")
                    ) : (
                      <div className="text-right flex items-center gap-2 self-start">
                        {canBookMore && (
                          <BookBtn
                            lessonId={lesson.id}
                            purchaseItems={availablePurchaseItems}
                            disabled={lesson.startTime.getTime() < now}
                          />
                        )}
                        {/* {hasAnyBooking && (
                        <Button
                          variant={"destructive"}
                          onClick={async () => await delBooking(lesson.id)}
                          disabled={lesson.startTime.getTime() < now}
                        >
                          Avboka
                        </Button>
                      )} */}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground">
                {t("user.booking.noLessons")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
