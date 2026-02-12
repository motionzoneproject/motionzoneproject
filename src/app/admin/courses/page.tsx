import type { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import CourseItem from "./CourseItem";
import CourseFilter from "./components/CourseFilter";
import AddCourseForm from "./forms/AddCourseForm";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; teacher?: string; termin?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const teacher = params.teacher || "";
  const termin = params.termin || "";

  const teachers = await prisma.user.findMany({
    where: { role: "admin" },
    orderBy: { name: "asc" },
  });
  const terminer = await prisma.termin.findMany({
    orderBy: { startDate: "desc" },
  });

  const where: Prisma.CourseWhereInput = {
    ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
    ...(teacher ? { teacherId: teacher } : {}),
    ...(termin ? { schemaItems: { some: { terminId: termin } } } : {}),
  };

  const allCourses = await prisma.course.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div>
        <div>
          <span className="font-bold text-2xl">Kurser</span>
          <AddCourseForm teachers={teachers} />
        </div>
        <div>
          <CourseFilter teachers={teachers} terminer={terminer} />
        </div>
      </div>

      <div className="w-full lg:grid lg:grid-cols-2 gap-2 p-2">
        {allCourses.map((c) => (
          <CourseItem course={c} key={c.id}></CourseItem>
        ))}
      </div>
    </div>
  );
}
