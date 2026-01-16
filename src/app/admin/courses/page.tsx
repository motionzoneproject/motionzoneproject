/*
Andrat (nya/lyfta komponenter och varför):
- SearchInput (SearchCourse) ligger i headern för att driva sökning via query
  i URL i stället för lokal state.

- AddCourseForm får teachers-listan server-side för att kunna välja lärare
  direkt utan extra klienthämtning.

- CourseItem renderas per rad och kan hämta kursrelaterad data server-side
  (t.ex. antal produkter/bokningar) utan klient-requests.

- LessonBrowserData visas i dialogen för att ladda lektioner per kurs on demand.
Hur routen fungerar nu:

- Page är en serverkomponent som tar searchParams, bygger query och hämtar
  allCourses via getAllCourses samt teachers via prisma innan render.

- Tabellen renderas server-side; varje CourseItem kan göra sina egna server-calls.

Tidigare:
- Data hämtades i klientkomponent (useEffect/API) efter initial render.
- Listor byggdes upp klient-side med extra request/state.

Resultat:
- Snabbare första render, mindre klientlogik och färre onödiga requests.
*/

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
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Kurser
          </h1>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl">
            Skapa och uppdatera kurser, koppla produkter och hantera
            lektionstillfällen.
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
