import { EditIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Course, User } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getCourseName } from "@/lib/tools";
import DeleteCourseBtn from "./components/DelCourseBtn";
import EditCourseForm from "./forms/EditCourseForm";

interface Props {
  course: Course;
  teachers: User[];
  teacherName?: string;
}

export default async function CourseItem({
  course,
  teachers,
  teacherName,
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
    <TableRow>
      <TableCell className="font-medium max-w-[360px] whitespace-normal">
        {getCourseName(course)}
      </TableCell>
      <TableCell>{teacherName ?? "Saknas"}</TableCell>
      <TableCell>
        {soldProducts}st{" "}
        <Link
          href={
            `../admin/students?course=${course.id}` /**fix: finns ej kursfilter ännu i admin/students, så kolla sen när det kommeer så det blir rätt. */
          }
        >
          <Button>Elever</Button>
        </Link>
      </TableCell>
      <TableCell className="">
        {lessonsCnt}st{" "}
        <Link
          href={`../admin/lectures?teacher=${course.teacherId}&course=${course.id}`}
        >
          <Button>
            <EditIcon />
          </Button>
        </Link>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <EditCourseForm teachers={teachers} course={course} />
          <DeleteCourseBtn courseId={course.id} />
        </div>
      </TableCell>
    </TableRow>
  );
}
