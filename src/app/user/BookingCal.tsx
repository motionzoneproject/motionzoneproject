"use client";

import { sv } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addUserInLesson } from "@/lib/actions/admin";
import type {
  BookingWithLesson,
  LessonWithCourse,
  UserPurchaseWithProduct,
} from "@/lib/actions/server-actions";
import BookBtn from "./BookBtn";

interface Props {
  lessons: LessonWithCourse[];
  bookings: BookingWithLesson[];
  purschaseItems: UserPurchaseWithProduct[];
}

export default function BookingCal({
  lessons,
  bookings,
  purschaseItems,
}: Props) {
  const [date, setDate] = useState<Date | undefined>(new Date());

  // 1. Förbered datumlistor för kalendern
  const bookedDays = useMemo(
    () => bookings.map((b) => new Date(b.lesson.startTime)),
    [bookings],
  );
  const availableDays = useMemo(
    () => lessons.map((l) => new Date(l.startTime)),
    [lessons],
  );

  // 2. Hitta lektioner för den valda dagen
  const selectedDateLessons = useMemo(() => {
    if (!date) return [];
    return lessons.filter(
      (l) => l.startTime.toDateString() === date.toDateString(),
    );
  }, [date, lessons]);

  const router = useRouter();
  const [_isPending, setIsPending] = useState(false);

  const _handleBooking = async (
    lessonId: string,
    userId: string,
    purchaseId: string,
  ) => {
    setIsPending(true);

    // Vi skickar datan som matchar ditt Zod-schema (AdminAddUserInLessonSchema)
    const result = await addUserInLesson({
      lessonId,
      userId,
      purchaseId,
    });

    if (result.success) {
      toast.success(result.msg);
      router.refresh(); // Uppdaterar propsen (lessons/bookings) så kalendern ändrar färg
    } else {
      toast.error(result.msg || "Något gick fel");
    }
    setIsPending(false);
  };

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
                const isAlreadyBooked = bookings.some(
                  (b) => b.lessonId === lesson.id,
                );

                return (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0"
                  >
                    <div>
                      <p className="font-semibold">
                        {lesson.startTime.toLocaleTimeString("sv-SE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {lesson.course.name}
                      </p>
                    </div>
                    {isAlreadyBooked ? (
                      <div>
                        <Button variant={"destructive"}>Avboka</Button>
                      </div>
                    ) : (
                      <div>
                        <BookBtn
                          courseId={lesson.courseId}
                          lessonId={lesson.id}
                          purschaseItems={purschaseItems.filter(
                            (itm) => itm.courseId === lesson.courseId,
                          )}
                        />
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
