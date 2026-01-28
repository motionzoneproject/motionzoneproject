import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Course } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { getCourseName } from "@/lib/tools";
import DeleteCourseBtn from "./components/DelCourseBtn";
import EditCourseForm from "./forms/EditCourseForm";

interface Props {
  course: Course;
}

export default async function CourseItem({ course }: Props) {
  const teachers = await prisma.user.findMany({ where: { role: "admin" } });

  return (
    <div className="p-2 ">
      <Card>
        <CardHeader>
          <div className="w-full lg:flex md:justify-between md:items-start">
            <CardTitle>
              <div>{getCourseName(course)}</div>
            </CardTitle>

            <div className="p-2 flex gap-2">
              <EditCourseForm teachers={teachers} course={course} />
              <DeleteCourseBtn courseId={course.id} />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="p-2 grid grid-cols-2 gap-2 bg-accent rounded">
            (statistik kommer)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
