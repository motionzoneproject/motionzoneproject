import { TableCell, TableRow } from "@/components/ui/table";
import type { Lesson } from "@/generated/prisma/client";
import { getFullCourseNameFromId } from "@/lib/actions/server-actions";
import { formatDateToInputStr } from "@/lib/date-utils";
import { dbToFormTime } from "@/lib/time-convert";
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
        {formatDateToInputStr(lesson.startTime)}
        <br />
        {dbToFormTime(lesson.startTime)} - {dbToFormTime(lesson.endTime)}
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
