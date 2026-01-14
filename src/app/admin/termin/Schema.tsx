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
  const scheduleDates = schemaItems.map((item) => ({
    start: item.customStartDate ?? termin.startDate,
    end: item.customEndDate ?? termin.endDate,
  }));
  const earliestStart =
    scheduleDates.length > 0
      ? scheduleDates.reduce(
          (min, current) => (current.start < min ? current.start : min),
          scheduleDates[0].start,
        )
      : null;
  const latestEnd =
    scheduleDates.length > 0
      ? scheduleDates.reduce(
          (max, current) => (current.end > max ? current.end : max),
          scheduleDates[0].end,
        )
      : null;

  return (
    <div className="border rounded-lg bg-muted/20">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Veckoschema
          </p>
          {earliestStart && latestEnd && (
            <p className="text-sm text-muted-foreground">
              {earliestStart.toLocaleDateString()} -{" "}
              {latestEnd.toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {schemaItems.length} kurstillfällen
        </div>
      </div>
      <div className="p-2">
        {schemaItems.length === 0 ? (
          "Inga kurser i veckoschemat."
        ) : (
          <Accordion type="single" collapsible>
            {weekdays.map((day) => (
              <SchemaDay
                allCourses={allCourses}
                weekdays={weekdays}
                termin={termin}
                schemaItems={schemaItems}
                weekday={day as Weekday}
                weekdayIndex={weekdays.indexOf(day)}
                key={day}
              />
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}
