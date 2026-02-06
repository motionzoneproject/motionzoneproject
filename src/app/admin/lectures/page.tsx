import { Button } from "@/components/ui/button";

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

  const where = {
    ...(sp.teacher ? { teacherId: sp.teacher } : {}),
    ...(sp.termin ? { terminId: sp.termin } : {}),
    ...(sp.course ? { courseId: sp.course } : {}),
    ...(sp.schemaitem ? { schemaItemId: sp.schemaitem } : {}),
    ...(sp.status ? { cancelled: sp.status === "cancelled" } : {}),
    ...(sp.from || sp.to
      ? {
          startTime: {
            ...(sp.from
              ? { gte: sp.hideold ? todayStart : new Date(sp.from) }
              : {}),
            ...(sp.to ? { lte: new Date(`${sp.to}T23:59:59.999`) } : {}),
          },
        }
      : sp.hideold
        ? { startTime: { gte: todayStart } }
        : {}),
  };

  const lessons = await prisma.lesson.findMany({
    where,
    orderBy: { startTime: "asc" },
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

      <div>
        <Button>Skapa lektioner</Button>
        <Button>Ställ in lektioner</Button>
        <Button>Meddelande</Button>
      </div>
      <div className="mt-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Datum - tid</TableHead>
              <TableHead>Kurs</TableHead>
              <TableHead>Status</TableHead>
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
    </div>
  );
}
