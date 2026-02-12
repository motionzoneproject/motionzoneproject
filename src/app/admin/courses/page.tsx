import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const teacherMap = new Map(teachers.map((t) => [t.id, t.name]));

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-2xl">Kurser</span>
        <AddCourseForm teachers={teachers} />
      </div>
      <CourseFilter teachers={teachers} terminer={terminer} />

      <div className="mt-2">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>Kurs</TableHead>
              <TableHead>Lärare</TableHead>
              <TableHead>Sålda produkter</TableHead>
              <TableHead>Lektioner</TableHead>
              <TableHead className="text-right">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allCourses.map((c) => (
              <CourseItem
                course={c}
                key={c.id}
                teachers={teachers}
                teacherName={teacherMap.get(c.teacherId)}
              />
            ))}
          </TableBody>
        </Table>
        {allCourses.length === 0 && (
          <div className="text-sm text-muted-foreground p-2 italic">
            Inga kurser hittades för valt filter.
          </div>
        )}
      </div>
    </div>
  );
}
