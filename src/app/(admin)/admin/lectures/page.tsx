import { PaginationBar } from "@/components/PaginationBar";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Course, SchemaItem, Termin } from "@/generated/prisma/client";
import { requireAdminOrTeacher } from "@/lib/actions/admin";
import { getSessionData } from "@/lib/actions/sessiondata";
import {
  endOfStockholmDateInput,
  parseStockholmDateInput,
  startOfStockholmDay,
} from "@/lib/date-utils";
import prisma from "@/lib/prisma";
import AdminLanguageSwitch from "../components/AdminLanguageSwitch";
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
    lang?: string;
  }>;
}

export default async function LecturePage({ searchParams }: Props) {
  await requireAdminOrTeacher();
  const sp = await searchParams;

  // Lärare kan bara se sina egna lektioner. En admin får filtrera fritt på
  // ?teacher=..., men för en lärare ignoreras query-parametern helt (den kan
  // inte tas emot från klienten) — de scopas alltid till sitt eget id.
  const sessionData = await getSessionData();
  const isTeacher = sessionData?.user.role === "teacher";
  const teacherFilter = isTeacher ? sessionData?.user.id : sp.teacher;

  const getTerminer = async (): Promise<Termin[]> => {
    const where = teacherFilter
      ? { schemaItems: { some: { course: { teacherId: teacherFilter } } } }
      : undefined;

    return await prisma.termin.findMany({ where });
  };

  const getCourses = async (): Promise<Course[]> => {
    const where = {
      ...(teacherFilter ? { teacherId: teacherFilter } : {}),
      ...(sp.termin ? { schemaItems: { some: { terminId: sp.termin } } } : {}),
    };

    return await prisma.course.findMany({ where });
  };

  const getSchemaItems = async (): Promise<SchemaItem[]> => {
    const where = {
      ...(sp.course ? { courseId: sp.course } : {}),
      ...(sp.termin ? { terminId: sp.termin } : {}),
      ...(teacherFilter ? { course: { teacherId: teacherFilter } } : {}),
    };

    return await prisma.schemaItem.findMany({ where });
  };

  const teachers = await prisma.user.findMany({
    where: { role: { in: ["admin", "teacher"] } },
  });

  const terminer = await getTerminer();

  const courses = await getCourses();

  const schemaItems = await getSchemaItems();

  const todayStart = startOfStockholmDay(new Date());
  const fromDate = sp.from ? parseStockholmDateInput(sp.from) : undefined;
  const toDate = sp.to ? endOfStockholmDateInput(sp.to) : undefined;
  const effectiveFromDate =
    sp.hideold && fromDate
      ? fromDate > todayStart
        ? fromDate
        : todayStart
      : sp.hideold
        ? todayStart
        : fromDate;

  // Build filters based on search params
  const filters = {
    ...(teacherFilter ? { teacherId: teacherFilter } : {}),
    ...(sp.termin ? { terminId: sp.termin } : {}),
    ...(sp.course ? { courseId: sp.course } : {}),
    ...(sp.schemaitem ? { schemaItemId: sp.schemaitem } : {}),
    // Bara de två värdena filterkomponenten kan producera. Tidigare gav vilket
    // annat ?status= som helst cancelled: false, alltså ett tyst filter som
    // dolde alla inställda lektioner.
    ...(sp.status === "cancelled"
      ? { cancelled: true }
      : sp.status === "active"
        ? { cancelled: false }
        : {}),
    ...(sp.from || sp.to
      ? {
          startTime: {
            ...(effectiveFromDate ? { gte: effectiveFromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
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

  const lang = sp.lang === "en" ? "en" : "sv";

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Lektioner</h1>
      <div className="space-y-0">
        <div className="mt-3 text-sm w-fit">Formulärspråk:</div>
        <div className="w-fit">
          <AdminLanguageSwitch value={lang ?? "sv"} />
        </div>
      </div>
      <LecturesFilter
        courses={courses}
        schemaItems={schemaItems}
        teachers={teachers}
        terminer={terminer}
        hideTeacherFilter={isTeacher}
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
                  <LessonItem lang={lang} lesson={l} key={l.id} />
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
