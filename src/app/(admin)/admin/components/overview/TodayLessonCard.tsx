import { Clock, MapPin, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { bookedCount, type LessonWithData } from "@/lib/admin-overview";
import { dbToFormTime } from "@/lib/time-convert";
import { AttendeDialog } from "../../lectures/components/attendence/AttendenceDialog";
import { EditLessonBtn } from "../../lectures/components/EditLesson";

interface TodayLessonCardProps {
  lesson: LessonWithData;
  /** Admin ser hela skolans dag och behöver veta vems lektion det är. */
  showTeacher?: boolean;
}

/**
 * En lektion idag, med närvaro och redigering direkt på kortet. Delas av
 * admin- och lärarvyn så de inte glider isär — enda skillnaden är om lärarens
 * namn visas.
 */
export function TodayLessonCard({
  lesson,
  showTeacher = false,
}: TodayLessonCardProps) {
  return (
    <Card className="border-l-4 border-l-primary">
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
            <Clock className="h-4 w-4 shrink-0" />
            {dbToFormTime(new Date(lesson.startTime))}–
            {dbToFormTime(new Date(lesson.endTime))}
          </span>

          {lesson.schemaItem.studio && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" />
              {lesson.schemaItem.studio.name}
            </span>
          )}

          {showTeacher && (
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4 shrink-0" />
              {lesson.teacher.name}
            </span>
          )}

          <span className="tabular-nums">{bookedCount(lesson)} bokade</span>
        </div>

        {lesson.message && (
          <p className="text-sm text-muted-foreground">{lesson.message}</p>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap items-center gap-4 border-t pt-3 text-xs">
        <AttendeDialog lesson={lesson} />
        <EditLessonBtn lesson={lesson} />
      </CardFooter>
    </Card>
  );
}
