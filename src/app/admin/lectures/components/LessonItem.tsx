import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Lesson } from "@/generated/prisma/client";
import { getFullCourseNameFromId } from "@/lib/actions/server-actions";

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
      <TableCell>?</TableCell>
      <TableCell className="text-right">
        <Button>Hantera</Button>
        <Button>Närvaro</Button>
      </TableCell>
    </TableRow>
  );
}
