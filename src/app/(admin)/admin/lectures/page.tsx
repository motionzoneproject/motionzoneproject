import { PaginationBar } from "@/components/PaginationBar";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Course, SchemaItem, Termin } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { LecturesFilter } from "./components/LecturesFilter";
import { LessonItem } from "./components/LessonItem";
import { Lov } from "./components/Lov";

interface Props {
  searchParams: Promise<{
    teacher?: string;
    from?: string;
    to?: string;
    termin?: string;
    course?: string;
    schemaitem?: string;
    status?: string;
    hideold?: string;
    page?: string;
  }>;
}

export default async function LecturePage({ searchParams }: Props) {
  const sp = await searchParams;

  const getTerminer = async (): Promise<Termin[]> => {
    const where = sp.teacher
      ? { schemaItems: { some: { course: { teacherId: sp.teacher } } } }
      : undefined;

    return await prisma.termin.findMany({ where });
  };

  const getCourses = async (): Promise<Course[]> => {
    const where = {
      ...(sp.teacher ? { teacherId: sp.teacher } : {}),
      ...(sp.termin ? { schemaItems: { some: { terminId: sp.termin } } } : {}),
    };

    return await prisma.course.findMany({ where });
  };

  const getSchemaItems = async (): Promise<SchemaItem[]> => {
    const where = {
      ...(sp.course ? { courseId: sp.course } : {}),
      ...(sp.termin ? { terminId: sp.termin } : {}),
      ...(sp.teacher ? { course: { teacherId: sp.teacher } } : {}),
    };

    return await prisma.schemaItem.findMany({ where });
  };

  const teachers = await prisma.user.findMany({ where: { role: "admin" } });

  const terminer = await getTerminer();

  const courses = await getCourses();

  const schemaItems = await getSchemaItems();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Build filters based on search params
  const filters = {
    ...(sp.teacher ? { teacherId: sp.teacher } : {}),
    ...(sp.termin ? { terminId: sp.termin } : {}),
    ...(sp.course ? { courseId: sp.course } : {}),
    ...(sp.schemaitem ? { schemaItemId: sp.schemaitem } : {}),
    ...(sp.status ? { cancelled: sp.status === "cancelled" } : {}),
    ...(sp.from || sp.to
      ? {
          startTime: {
            ...(sp.from
              ? {
                  gte: sp.hideold
                    ? todayStart
                    : new Date(`${sp.from}T00:00:00`),
                }
              : {}),
            ...(sp.to ? { lte: new Date(`${sp.to}T23:59:59.999`) } : {}),
          },
        }
      : sp.hideold
        ? { startTime: { gte: todayStart } }
        : {}),
  };

  // Pagination
  const ITEMS_PER_PAGE = 20;
  const currentPage = Number(sp.page) || 1;
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  // Get total count for pagination
  const totalLessons = await prisma.lesson.count({ where: filters });
  const totalPages = Math.ceil(totalLessons / ITEMS_PER_PAGE);

  const lessons = await prisma.lesson.findMany({
    where: filters,
    orderBy: { startTime: "asc" },
    skip,
    take: ITEMS_PER_PAGE,
  });

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Lektioner</h1>

      <LecturesFilter
        courses={courses}
        schemaItems={schemaItems}
        teachers={teachers}
        terminer={terminer}
      />

      <Lov courses={courses} terminer={terminer} schemaItems={schemaItems} />

      {totalLessons > 0 ? (
        <>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Visar {skip + 1}-{Math.min(skip + ITEMS_PER_PAGE, totalLessons)}{" "}
              av {totalLessons} lektioner
            </span>
          </div>

          <div className="mt-2">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Datum - tid</TableHead>
                  <TableHead>Kurs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Närvaro</TableHead>
                  <TableHead className="text-right">Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lessons.map((l) => (
                  <LessonItem lesson={l} key={l.id} />
                ))}
              </TableBody>
            </Table>
          </div>

          <PaginationBar currentPage={currentPage} totalPages={totalPages} />
        </>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-muted/20 mt-4">
          <p className="text-muted-foreground">
            Inga lektioner hittades med nuvarande filter.
          </p>
        </div>
      )}
    </div>
  );
}
