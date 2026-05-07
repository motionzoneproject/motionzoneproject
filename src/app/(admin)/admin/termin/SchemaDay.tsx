import { Calendar, Clock, ListChecks } from "lucide-react";
import Link from "next/link";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type { Course, Termin } from "@/generated/prisma/client";
import type { Weekday } from "@/generated/prisma/enums";
import type { SchemaItemWithCourse } from "@/lib/actions/admin";
import { dbToFormTime } from "@/lib/time-convert";
import { getCourseName, getVeckodag, getWeekdays } from "@/lib/tools";
import DeleteSchemaItemBtn from "./components/DeleteSchemaItemBtn";
import EditCourseToSchemaForm from "./forms/EditCourseToSchemaForm";

interface Props {
  schemaItems: SchemaItemWithCourse[];
  weekday: Weekday;
  termin: Termin;
  allCourses: Course[];
  lang: "sv" | "en";
}

export default function SchemaDay({
  schemaItems,
  weekday,
  termin,
  allCourses,
  lang = "sv",
}: Props) {
  if (schemaItems.filter((itm) => itm.weekday === weekday).length === 0)
    return null;

  const weekdays = getWeekdays();

  return (
    <AccordionItem value={weekday}>
      <AccordionTrigger className="rounded-md px-3 py-2 hover:bg-muted/40">
        <div className="flex w-full items-center justify-between pr-2">
          <div className="text-left">
            <p className="font-semibold">{getVeckodag(weekday, lang)}</p>
            <p className="text-xs text-muted-foreground">
              {schemaItems.filter((itm) => itm.weekday === weekday).length}st{" "}
              kurstillfällen
            </p>
          </div>
        </div>
      </AccordionTrigger>
      {schemaItems
        .filter((itm) => itm.weekday === weekday)
        .sort((a, b) =>
          dbToFormTime(a.timeStart).localeCompare(dbToFormTime(b.timeStart)),
        )
        .map((itm) => {
          return (
            <AccordionContent key={itm.id}>
              <div className="bg-muted/30 border-border text-foreground border p-3 rounded-lg flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border px-2 py-0.5 inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{" "}
                      {itm.customStartDate
                        ? itm.customStartDate.toLocaleDateString()
                        : termin.startDate.toLocaleDateString()}
                      {" - "}
                      {itm.customEndDate
                        ? itm.customEndDate.toLocaleDateString()
                        : termin.endDate.toLocaleDateString()}
                    </span>
                    <span className="rounded-full border px-2 py-0.5 inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />{" "}
                      {dbToFormTime(itm.timeStart)} -{" "}
                      {dbToFormTime(itm.timeEnd)}
                    </span>
                  </div>
                  <div className="text-base font-semibold">
                    {getCourseName(itm.course, lang)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Plats:{" "}
                    {lang === "en" ? itm.place2 : itm.place || "Ej angiven"}
                  </div>
                  <Link
                    href={`/admin/lectures?schemaitem=${itm.id}&termin=${itm.terminId}&course=${itm.courseId}`}
                  >
                    <Button
                      variant="outline"
                      className="h-8 p-0 cursor-pointer"
                    >
                      <ListChecks />
                      Lektioner ({itm.Lessons.length}st)
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center gap-2 md:flex-col md:items-end">
                  <EditCourseToSchemaForm
                    termin={termin}
                    schemaItem={itm}
                    allCourses={allCourses}
                    weekdays={weekdays}
                  />
                  <DeleteSchemaItemBtn itemId={itm.id} />
                </div>
              </div>
            </AccordionContent>
          );
        })}
    </AccordionItem>
  );
}
