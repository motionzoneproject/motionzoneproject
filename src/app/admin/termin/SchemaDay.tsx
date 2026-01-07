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
      <AccordionTrigger>
        {veckodagar[weekdayIndex]} (
        {schemaItems.filter((itm) => itm.weekday === weekday).length})
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
              <div className="bg-blue-500/10 border-blue-500/20 text-foreground border-2 p-2 rounded-lg flex justify-between">
                <div>
                  {dbToFormTime(itm.timeStart)} - {dbToFormTime(itm.timeEnd)}
                  <br />
                  {itm.customStartDate
                    ? itm.customStartDate.toLocaleDateString()
                    : termin.startDate.toLocaleDateString()}
                  -
                  {itm.customEndDate
                    ? itm.customEndDate.toLocaleDateString()
                    : termin.endDate.toLocaleDateString()}
                  <br />
                  <span className="font-bold">{getCourseName(itm.course)}</span>
                  <br />
                  <span className="font-bold">Plats: {itm.place}</span>
                </div>
                <div>
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
