"use client";

import { sv } from "date-fns/locale";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  BookingWithLesson,
  LessonWithCourse,
  UserPurchaseWithProduct,
} from "@/lib/actions/server-actions";
import BookBtn from "./BookBtn";
import CancelBookingBtn from "./CancelBookingBtn";

interface Props {
  lessons: LessonWithCourse[]; // Alla lektioner i alla kurser som kunden har tillgång till.
  bookings: BookingWithLesson[]; // Alla bokningar gjorda av kunden.
  purschaseItems: UserPurchaseWithProduct[]; // Alla produkter (purschaseItems) som tillhör kunden, med info om vilka kurser kunden kan boka med en viss produkt.
}

export default function BookingCal({
  lessons,
  bookings,
  purschaseItems,
}: Props) {
  const [date, setDate] = useState<Date | undefined>(new Date());

  const bookedDays = useMemo(
    () =>
      bookings
        .filter((b) => !b.cancelled)
        .map((b) => new Date(b.lesson.startTime)),
    [bookings],
  );
  const availableDays = useMemo(
    () => lessons.map((l) => new Date(l.startTime)),
    [lessons],
  );
  const cancelledDays = useMemo(
    () => lessons.filter((l) => l.cancelled).map((l) => new Date(l.startTime)),
    [lessons],
  );

  // 2. Hitta lektioner för den valda dagen
  const selectedDateLessons = useMemo(() => {
    if (!date) return [];
    return lessons.filter(
      (l) => l.startTime.toDateString() === date.toDateString(),
    );
  }, [date, lessons]);

  return (
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
            <span>Redan bokad lektion</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full border-2 border-green-500" />
            <span>Ledig lektion (kan bokas)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
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
                // Okej så här kollar vi om den redan är bokad genom att söka efter lessonId i bookings:
                const lessonBookings = bookings.filter(
                  (b) => b.lessonId === lesson.id && !b.cancelled,
                );
                const bookedPurchaseItemIds = new Set(
                  lessonBookings.map((b) => b.purchaseItemId),
                );
                const coursePurchaseItems = purschaseItems.filter(
                  (itm) => itm.courseId === lesson.courseId,
                );
                const bookablePurchaseItems = coursePurchaseItems.filter(
                  (itm) => {
                    if (bookedPurchaseItemIds.has(itm.id)) return false;
                    if (itm.unlimited) return true;
                    if (itm.purchase.type === "CLIP") {
                      return (itm.purchase.remainingCount ?? 0) > 0;
                    }
                    return itm.remainingCount > 0;
                  },
                );
                const isFull =
                  lesson.maxBookings > 0 &&
                  lesson.bookings.length >= lesson.maxBookings;

                return (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between border rounded-lg p-4 bg-muted/20"
                  >
                    <div>
                      <p className="font-semibold">
                        {lesson.startTime.toLocaleTimeString("sv-SE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {lesson.course.name}{" "}
                        {lesson.cancelled && (
                          <span className="font-bold text-red-500">
                            (INSTÄLLD)
                          </span>
                        )}
                        <br />
                        {lesson.message}
                      </p>
                      {lessonBookings.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {lessonBookings.map((b) => {
                            const name =
                              b.purchaseItem.purchase.participant?.name ?? "Du";
                            return (
                              <div
                                key={b.id}
                                className="flex items-center justify-between gap-3 rounded border bg-background px-3 py-2 text-sm"
                              >
                                <span>Bokad: {name}</span>
                                <CancelBookingBtn bookingId={b.id} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {lesson.cancelled ? (
                      "Inställd."
                    ) : bookablePurchaseItems.length > 0 && !isFull ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-end">
                          <BookBtn
                            courseId={lesson.courseId}
                            lessonId={lesson.id}
                            purschaseItems={bookablePurchaseItems}
                          />
                        </div>
                      </div>
                    ) : isFull ? (
                      <div>
                        <Button variant="secondary" disabled>
                          Fullbokad
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <Button variant="secondary" disabled>
                          Inga tillfällen kvar
                        </Button>
                      </div>
                    )}
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
  );
}
