import { PaginationBar } from "@/components/PaginationBar";
import { requireAdmin } from "@/lib/actions/admin";
import { loadStudentList } from "@/lib/admin-students";
import prisma from "@/lib/prisma";
import { getCourseName } from "@/lib/tools";
import StudentsFilter from "./components/StudentsFilter";
import StudentTableClient from "./components/StudentTableClient";

export type { StudentSummary } from "@/lib/admin-students";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    teacher?: string;
    termin?: string;
    page?: string;
    course?: string;
    product?: string;
    approval?: string;
  }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const course = params.course || "";

  const teachers = await prisma.user.findMany({
    where: { role: { in: ["admin", "teacher"] } },
    orderBy: { name: "asc" },
  });

  const terminer = await prisma.termin.findMany({
    orderBy: { startDate: "desc" },
  });

  const courses = await prisma.course.findMany({ orderBy: { name: "asc" } });

  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });

  const allStudents = await loadStudentList(params, courses);

  const ITEMS_PER_PAGE = 10;
  const currentPage = Number(params.page) || 1;
  const totalStudents = allStudents.length;
  const totalPages = Math.ceil(totalStudents / ITEMS_PER_PAGE);
  const pageStudents = allStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-2xl">Elever</span>
      </div>

      <StudentsFilter
        courses={courses}
        products={products}
        teachers={teachers}
        terminer={terminer}
      />

      <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
        <span>Totalt {totalStudents} elever</span>
      </div>

      <StudentTableClient
        students={pageStudents}
        course={
          course
            ? (courses
                .filter((c) => c.id === course)
                .map((c) => ({ id: c.id, name: getCourseName(c) }))[0] ?? null)
            : null
        }
      />

      {totalPages > 1 && (
        <div className="mt-4">
          <PaginationBar currentPage={currentPage} totalPages={totalPages} />
        </div>
      )}
    </div>
  );
}
