import { PaginationBar } from "@/components/PaginationBar";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/actions/admin";
import prisma from "@/lib/prisma";
import CourseItem from "./CourseItem";
import CourseFilter from "./components/CourseFilter";
import AddCourseForm from "./forms/AddCourseForm";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    teacher?: string;
    termin?: string;
    page?: string;
    showInactive?: string;
  }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const query = params.q || "";
  const teacher = params.teacher || "";
  const termin = params.termin || "";
  const showInactive = params.showInactive === "yes";

  const teachers = await prisma.user.findMany({
    where: { role: "admin" },
    orderBy: { name: "asc" },
  });
  const terminer = await prisma.termin.findMany({
    orderBy: { startDate: "desc" },
  });

  const where: Prisma.CourseWhereInput = {
    ...(showInactive ? {} : { active: true }),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { name2: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(teacher ? { teacherId: teacher } : {}),
    ...(termin ? { schemaItems: { some: { terminId: termin } } } : {}),
  };

  // Pagination
  const ITEMS_PER_PAGE = 10;
  const currentPage = Number(params.page) || 1;
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  // Get total count for pagination
  const totalCourses = await prisma.course.count({ where });
  const totalPages = Math.ceil(totalCourses / ITEMS_PER_PAGE);

  const allCourses = await prisma.course.findMany({
    where,
    orderBy: { name: "asc" },
    skip,
    take: ITEMS_PER_PAGE,
  });
  const teacherMap = new Map(teachers.map((t) => [t.id, t.name]));

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-2xl">Kurser</span>
        <AddCourseForm teachers={teachers} />
      </div>
      <CourseFilter teachers={teachers} terminer={terminer} />

      <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
        <span>Totalt {totalCourses} kurser</span>
      </div>

      <div className="mt-2">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>Kurs</TableHead>
              <TableHead>Lärare</TableHead>
              <TableHead>Sålda produkter / sök elever</TableHead>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4">
          <PaginationBar currentPage={currentPage} totalPages={totalPages} />
        </div>
      )}
    </div>
  );
}
