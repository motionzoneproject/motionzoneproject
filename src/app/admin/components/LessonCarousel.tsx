"use client";

import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Booking } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

// Define a type that matches the structure we expect from the server
interface LessonWithCourse {
  id: string;
  startTime: Date;
  endTime: Date;
  course: {
    name: string;
  };
  place?: string | null;
  teacher: {
    name: string;
  };
  bookings: Booking[];
  maxBookings: number;
}

interface LessonCarouselProps {
  lessons: LessonWithCourse[];
  initialScrollIndex: number;
}

export function LessonCarousel({
  lessons,
  initialScrollIndex,
}: LessonCarouselProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Scroll to the initial index on mount
  React.useEffect(() => {
    if (scrollContainerRef.current && initialScrollIndex >= 0) {
      const container = scrollContainerRef.current;
      const cardWidth = 300; // Approximate width of a card + gap
      const scrollPos = initialScrollIndex * cardWidth;

      // Attempt to center it:
      const containerWidth = container.clientWidth;
      const centeredPos = scrollPos - containerWidth / 2 + cardWidth / 2;

      container.scrollTo({
        left: Math.max(0, centeredPos),
        behavior: "smooth",
      });
    }
  }, [initialScrollIndex]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  if (lessons.length === 0) {
    return (
      <div className="text-muted-foreground p-4">
        Inga lektioner hittades för denna termin.
      </div>
    );
  }

  return (
    <div className="relative w-full group">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
          onClick={scrollLeft}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto gap-4 p-4 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {lessons.map((lesson, _index) => {
          const isPast = new Date(lesson.endTime) < new Date();
          return (
            <div
              key={lesson.id}
              className="min-w-[280px] max-w-[280px] snap-center"
            >
              <Card
                className={cn(
                  "h-full border-l-4 transition-all hover:shadow-md",
                  isPast
                    ? "border-l-gray-300 opacity-70 grayscale-[0.5]"
                    : "border-l-primary",
                )}
              >
                <CardHeader className="pb-2">
                  <div className="text-sm text-muted-foreground capitalize">
                    {format(new Date(lesson.startTime), "EEEE d MMMM", {
                      locale: sv,
                    })}
                  </div>
                  <CardTitle className="text-lg leading-tight line-clamp-2">
                    {lesson.course.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-2 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(lesson.startTime), "HH:mm")} -{" "}
                      {format(new Date(lesson.endTime), "HH:mm")}
                    </span>
                  </div>
                  {lesson.place && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{lesson.place}</span>
                    </div>
                  )}
                  <div className="text-muted-foreground truncate">
                    Lärare: {lesson.teacher.name}
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t text-xs flex justify-between text-muted-foreground">
                  <span>
                    {lesson.bookings.length} / {lesson.maxBookings} bokade
                  </span>
                  {isPast ? (
                    <span>Avslutad</span>
                  ) : (
                    <span className="text-primary font-medium">Kommande</span>
                  )}
                </CardFooter>
              </Card>
            </div>
          );
        })}
      </div>

      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
          onClick={scrollRight}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
