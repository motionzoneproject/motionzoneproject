import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAllCourses } from "@/lib/actions/admin";
import prisma from "@/lib/prisma";
import CourseItem from "./CourseItem";
import SearchInput from "./components/SearchCourse";
import AddCourseForm from "./forms/AddCourseForm";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";

  const allCourses = await getAllCourses(query);
  const teachers = await prisma.user.findMany({ where: { role: "admin" } });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kurser</h1>
          <p className="text-muted-foreground">
            Hantera kursdetaljer, produkter och lektioner.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchInput />
          <AddCourseForm teachers={teachers} />
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <Table className="min-w-[900px] text-sm">
          <TableHeader>
            <TableRow className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <TableHead className="p-3 text-left">Kurs</TableHead>
              <TableHead className="p-3 text-left">Tillgång</TableHead>
              <TableHead className="p-3 text-left">Produkter</TableHead>
              <TableHead className="p-3 text-left">Lektioner</TableHead>
              <TableHead className="p-3 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allCourses.map((c) => (
              <CourseItem course={c} teachers={teachers} key={c.id} />
            ))}
          </TableBody>
        </Table>
      </div>

      {allCourses.length === 0 && (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground">Inga kurser hittades.</p>
        </div>
      )}
    </div>
  );
}
