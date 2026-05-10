import { TableCell, TableRow } from "@/components/ui/table";
import type { Lesson } from "@/generated/prisma/client";
import { getFullCourseNameFromId } from "@/lib/actions/server-actions";
import { AttendeDialog } from "./attendence/AttendenceDialog";
import { EditLessonBtn } from "./EditLesson";

export async function LessonItem({
  lesson,
  lang = "sv",
}: {
  lesson: Lesson;
  lang: "sv" | "en";
}) {
  const courseName = await getFullCourseNameFromId(lesson.courseId, lang);

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
      <TableCell className="max-w-[260px] whitespace-normal">
        {courseName}
      </TableCell>
      <TableCell className="max-w-[260px] whitespace-normal">
        {lesson.message}
        {lesson.cancelled && <div className="text-red-500">Inställd.</div>}
      </TableCell>
      <TableCell>
        <AttendeDialog lesson={lesson} />
      </TableCell>
      <TableCell className="text-right">
        <EditLessonBtn lesson={lesson} />
      </TableCell>
    </TableRow>
  );
}
