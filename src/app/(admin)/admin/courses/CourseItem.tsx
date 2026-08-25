import { EditIcon, EyeOffIcon, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Course, Style, User } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getCourseName } from "@/lib/tools";
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

  // Räknar alla sålda produkter med tillgång till kursen
  const soldProducts = await prisma.purchase.count({
    where: {
      PurchaseItems: {
        some: {
          courseId: course.id,
        },
      },
    },
  });

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
          <span>{soldProducts}st</span>
          <Link
            href={
              `../admin/students?course=${course.id}` /**fix: finns ej kursfilter ännu i admin/students, så kolla sen när det kommeer så det blir rätt. */
            }
          >
            <Button variant="ghost">
              <Search className="h-4 w-4" /> Elever
            </Button>
          </Link>
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
