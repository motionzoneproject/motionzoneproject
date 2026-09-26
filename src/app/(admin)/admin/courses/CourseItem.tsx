import { EditIcon, EyeOffIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Course, Style, User } from "@/generated/prisma/client";
import { getCourseRoster } from "@/lib/actions/roster-actions";
import prisma from "@/lib/prisma";
import { getCourseName } from "@/lib/tools";
import { CourseRosterDialog } from "../components/CourseRosterDialog";
import DeleteCourseBtn from "./components/DelCourseBtn";
import ToggleCourseActiveBtn from "./components/ToggleCourseActiveBtn";
import EditCourseForm from "./forms/EditCourseForm";

interface Props {
  course: Course;
  styles: Style[];
  teachers: User[];
  teacherName?: string;
  lang?: "sv" | "en";
}

export default async function CourseItem({
  course,
  styles,
  teachers,
  teacherName,
  lang = "sv",
}: Props) {
  const lessonsCnt = await prisma.lesson.count({
    where: { courseId: course.id },
  });

  // Elever som går kursen, från samma funktion som "Hantera elever" visar —
  // antalet och listan kan då inte säga olika saker. Att räkna alla köp med
  // tillgång gav terminskortens och programmens köpare i nästan varje kurs.
  const roster = await getCourseRoster(course.id);
  const studentCount = roster?.students.length ?? 0;

  return (
    <TableRow className={!course.active ? "opacity-60" : ""}>
      <TableCell className="font-medium max-w-[360px] whitespace-normal">
        <div className="flex items-center gap-2">
          {getCourseName(course, lang)}
          {!course.active && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
              <EyeOffIcon className="h-3 w-3" />
              Inaktiv
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>{teacherName ?? "Saknas"}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span>{studentCount}st</span>
          <CourseRosterDialog courseId={course.id} />
        </div>
      </TableCell>
      <TableCell>
        <Link
          href={`../admin/lectures?teacher=${course.teacherId}&course=${course.id}`}
        >
          <Button variant="ghost">
            <EditIcon /> ({lessonsCnt}st)
            <span className="sr-only">Redigera lektioner </span>
          </Button>
        </Link>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end items-center gap-2">
          <ToggleCourseActiveBtn
            courseId={course.id}
            courseName={getCourseName(course, lang)}
            active={course.active}
          />
          <EditCourseForm teachers={teachers} styles={styles} course={course} />
          <DeleteCourseBtn courseId={course.id} />
        </div>
      </TableCell>
    </TableRow>
  );
}
