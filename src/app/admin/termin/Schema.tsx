import { Accordion } from "@/components/ui/accordion";
import { Weekday } from "@/generated/prisma/enums";
import type { SchemaItemWithCourse } from "@/lib/actions/admin";
import SchemaDay from "./SchemaDay";

interface SchemaProps {
  schemaItems: SchemaItemWithCourse[];
}

export default function Schema({ schemaItems }: SchemaProps) {
  const weekdays = Object.keys(Weekday);

  return (
    <Accordion type="single" className="p-2 border-2 rounded" collapsible>
      {schemaItems.length === 0
        ? "Inga kurser i veckoschemat."
        : weekdays.map((day) => {
            return (
              <SchemaDay
                schemaItems={schemaItems}
                weekday={day as Weekday}
                weekdayIndex={weekdays.indexOf(day)}
                key={day}
              ></SchemaDay>
            );
          })}
    </Accordion>
  );
}
