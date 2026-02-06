import { TableCell, TableRow } from "@/components/ui/table";
import type { Lesson } from "@/generated/prisma/client";
import { getFullCourseNameFromId } from "@/lib/actions/server-actions";
import { EditLessonBtn } from "./EditLesson";

export async function LessonItem({ lesson }: { lesson: Lesson }) {
  const courseName = await getFullCourseNameFromId(lesson.courseId);

  return (
    <TableRow>
      <TableCell className="font-medium">
        {lesson.startTime.toLocaleDateString("sv-SE")}
        <br />
        {lesson.startTime.toLocaleTimeString("sv-SE", {
          hour: "2-digit",
          minute: "2-digit",
        })}{" "}
        -{" "}
        {lesson.endTime.toLocaleTimeString("sv-SE", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </TableCell>
      <TableCell>{courseName}</TableCell>
      <TableCell>
        {lesson.message}
        {lesson.cancelled && <div className="text-red-500">Inställd.</div>}
      </TableCell>
      <TableCell>0/{lesson.maxBookings}</TableCell>
      <TableCell className="text-right">
        <EditLessonBtn lesson={lesson} />
      </TableCell>
    </TableRow>
  );
}
