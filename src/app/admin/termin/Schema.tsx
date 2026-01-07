import { Accordion } from "@/components/ui/accordion";
import type { Course, Termin } from "@/generated/prisma/client";
import { Weekday } from "@/generated/prisma/enums";
import type { SchemaItemWithCourse } from "@/lib/actions/admin";
import SchemaDay from "./SchemaDay";

interface SchemaProps {
  schemaItems: SchemaItemWithCourse[]; // Tar emot alla schemaItems (som har denna terminId) inkl kursdata.
  termin: Termin;
  allCourses: Course[];
}

export default function Schema({
  schemaItems,
  termin,
  allCourses,
}: SchemaProps) {
  const weekdays = Object.keys(Weekday); // Hämta veckodagar från prismaschemats enum.

  return (
    <Accordion type="single" className="p-2 border-2 rounded" collapsible>
      {schemaItems.length === 0
        ? "Inga kurser i veckoschemat."
        : weekdays.map((day) => {
            return (
              <SchemaDay
                allCourses={allCourses}
                weekdays={weekdays}
                termin={termin}
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
