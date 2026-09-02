import { Clock, MapPin } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LessonWithData } from "@/lib/admin-overview";
import { formatLongFriendlyDate } from "@/lib/date-utils";
import { dbToFormTime } from "@/lib/time-convert";
import { cn } from "@/lib/utils";
import { AttendeDialog } from "../lectures/components/attendence/AttendenceDialog";
import { EditLessonBtn } from "../lectures/components/EditLesson";
import { LessonCarouselInteractive } from "./LessonCarouselInteractive";

interface LessonCarouselProps {
  lessons: LessonWithData[];
  initialScrollIndex: number;
}

export function LessonCarousel({
  lessons,
  initialScrollIndex,
}: LessonCarouselProps) {
  if (lessons.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Du står inte som lärare på någon lektion den närmaste månaden.
      </div>
    );
  }

  return (
    <LessonCarouselInteractive initialScrollIndex={initialScrollIndex}>
      {lessons.map((lesson) => {
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
                  {formatLongFriendlyDate(new Date(lesson.startTime))}
                </div>
                <CardTitle className="text-lg leading-tight line-clamp-2">
                  {lesson.course.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-2 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {dbToFormTime(new Date(lesson.startTime))} -{" "}
                    {dbToFormTime(new Date(lesson.endTime))}
                  </span>
                </div>
                {lesson.schemaItem.studio && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{lesson.schemaItem.studio.name}</span>
                  </div>
                )}
                <div className="text-muted-foreground truncate">
                  Lärare: {lesson.teacher.name}
                </div>
                <div className="text-muted-foreground truncate">
                  Meddelande:
                  <br />
                  {lesson.message} {lesson.cancelled && "(Inställd)"}
                </div>
              </CardContent>
              <CardFooter className="pt-2 border-t text-xs flex flex-col justify-between text-foreground  gap-2">
                <div className="flex  justify-between gap-6 w-full">
                  <div className="font-bold ">
                    <span className="p-2">Närvaro</span>
                    <br />
                    <AttendeDialog lesson={lesson} />
                  </div>
                  <div className="font-bold text-center">
                    <span className="p-2">Status</span>
                    <br />
                    <EditLessonBtn lesson={lesson} />
                  </div>
                </div>
              </CardFooter>
            </Card>
          </div>
        );
      })}
    </LessonCarouselInteractive>
  );
}
