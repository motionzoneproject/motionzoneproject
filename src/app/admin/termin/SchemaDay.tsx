import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Weekday } from "@/generated/prisma/enums";

import type { SchemaItemWithCourse } from "@/lib/actions/admin";
import { dbToFormTime } from "@/lib/time-convert";
import DeleteSchemaItemBtn from "./components/DeleteSchemaItemBtn";

interface Props {
  schemaItems: SchemaItemWithCourse[];
  weekday: Weekday;
  weekdayIndex: number;
}

export default async function SchemaDay({
  schemaItems,
  weekday,
  weekdayIndex,
}: Props) {
  const veckodagar = [
    "Måndag",
    "Tisdag",
    "Onsdag",
    "Torsdag",
    "Fredag",
    "Lördag",
    "Söndag",
  ];

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
              <div className="bg-blue-200 border-blue-800 text-black border-2 p-2 rounded-lg flex justify-between">
                <div>
                  {dbToFormTime(itm.timeStart)} - {dbToFormTime(itm.timeEnd)}
                  <br />
                  <span className="font-bold">{itm.course.name}</span>
                </div>
                <div>
                  <DeleteSchemaItemBtn itemId={itm.id} />
                </div>
              </div>
            </AccordionContent>
          );
        })}
    </AccordionItem>
  );
}
