import { AlertTriangle, Calendar, Clock, Layers } from "lucide-react";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Course, Termin } from "@/generated/prisma/client";
import type { Weekday } from "@/generated/prisma/enums";
import type { SchemaItemWithCourse } from "@/lib/actions/admin";
import { dbToFormTime } from "@/lib/time-convert";
import { getCourseName } from "@/lib/tools";
import DeleteSchemaItemBtn from "./components/DeleteSchemaItemBtn";
import EditCourseToSchemaForm from "./forms/EditCourseToSchemaForm";

interface Props {
  schemaItems: SchemaItemWithCourse[];
  weekday: Weekday;
  weekdayIndex: number;
  termin: Termin;
  allCourses: Course[];
  weekdays: string[];
}

export const veckodagar = [
  "Måndag",
  "Tisdag",
  "Onsdag",
  "Torsdag",
  "Fredag",
  "Lördag",
  "Söndag",
];

export const getVeckodag = (day: Weekday) => {
  switch (day) {
    case "MONDAY":
      return "Måndag";
    case "TUESDAY":
      return "Tisdag";
    case "WEDNESDAY":
      return "Onsdag";
    case "THURSDAY":
      return "Torsdag";
    case "FRIDAY":
      return "Fredag";
    case "SATURDAY":
      return "Lördag";
    case "SUNDAY":
      return "Söndag";
    default:
      return day; // Returnerar originalsträngen om ingen matchning hittas
  }
};

export default async function SchemaDay({
  schemaItems,
  weekday,
  weekdayIndex,
  termin,
  allCourses,
  weekdays,
}: Props) {
  if (schemaItems.filter((itm) => itm.weekday === weekday).length === 0)
    return null;

  return (
    <AccordionItem value={weekday}>
      <AccordionTrigger className="rounded-md px-3 py-2 hover:bg-muted/40">
        <div className="flex w-full items-center justify-between pr-2">
          <div className="text-left">
            <p className="font-semibold">{veckodagar[weekdayIndex]}</p>
            <p className="text-xs text-muted-foreground">
              {schemaItems.filter((itm) => itm.weekday === weekday).length}{" "}
              kurstillfällen
            </p>
          </div>
          <div className="text-xs text-muted-foreground">Visa</div>
        </div>
      </AccordionTrigger>
      {schemaItems
        .filter((itm) => itm.weekday === weekday)
        .sort((a, b) =>
          dbToFormTime(a.timeStart).localeCompare(dbToFormTime(b.timeStart)),
        )
        .map(async (itm) => {
          // const itmCourse = await getCourseById(itm.id);

          return (
            <AccordionContent key={itm.id}>
              <div className="bg-muted/30 border-border text-foreground border p-3 rounded-lg flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border px-2 py-0.5 inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {dbToFormTime(itm.timeStart)} -{" "}
                      {dbToFormTime(itm.timeEnd)}
                    </span>
                    <span className="rounded-full border px-2 py-0.5 inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {itm.customStartDate
                        ? itm.customStartDate.toLocaleDateString()
                        : termin.startDate.toLocaleDateString()}
                      {" - "}
                      {itm.customEndDate
                        ? itm.customEndDate.toLocaleDateString()
                        : termin.endDate.toLocaleDateString()}
                    </span>
                    <span className="rounded-full border px-2 py-0.5 inline-flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      {itm.Lessons.length} lektioner
                    </span>
                    {itm.Lessons.some((lesson) => lesson.cancelled) && (
                      <span className="rounded-full border px-2 py-0.5 inline-flex items-center gap-1 text-red-500 border-red-500/40">
                        <AlertTriangle className="h-3 w-3" />
                        {
                          itm.Lessons.filter((lesson) => lesson.cancelled)
                            .length
                        }{" "}
                        st inställda
                      </span>
                    )}
                  </div>
                  <div className="text-base font-semibold">
                    {getCourseName(itm.course)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Plats: {itm.place || "Ej angiven"}
                  </div>
                </div>
                <div className="flex items-center gap-2 md:flex-col md:items-end">
                  <EditCourseToSchemaForm
                    allCourses={allCourses}
                    weekdays={weekdays}
                    termin={termin}
                    schemaItem={itm}
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
