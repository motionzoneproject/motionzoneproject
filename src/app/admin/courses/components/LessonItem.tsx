import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LessonWithBookings } from "@/lib/actions/admin";
import LessonAttendanceForm from "./LessonAttendanceForm";
import LessonItemForm from "./LessonItemForm";

interface Props {
  lesson: LessonWithBookings;
}

export default function LessonItem({ lesson }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{lesson.startTime.toLocaleDateString("sv-SE")}</CardTitle>
        <CardDescription>
          {lesson.startTime
            .toLocaleDateString("sv-SE", { weekday: "long" })
            .toUpperCase()}
          <br />
          Tid:
          <br />
          {lesson.startTime.toLocaleTimeString("sv-SE", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {" - "}
          {lesson.endTime.toLocaleTimeString("sv-SE", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </CardDescription>
        <CardAction>
          <LessonAttendanceForm lesson={lesson} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <LessonItemForm lesson={lesson} />{" "}
      </CardContent>
      <CardFooter>
        {" "}
        <p>
          {lesson.bookings.length}{" "}
          {lesson.maxBookings > 0 && ` / ${lesson.maxBookings}`} bokningar
        </p>
      </CardFooter>
    </Card>
  );
}
