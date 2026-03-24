import { Accordion } from "@/components/ui/accordion";
import type { Course, Termin } from "@/generated/prisma/client";
import type { SchemaItemWithCourse } from "@/lib/actions/admin";
import { getWeekdays } from "@/lib/tools";
import AddCourseToSchemaForm from "./forms/AddCourseToSchemaForm";
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
  const weekdays = getWeekdays();
  return (
    <div className="border rounded-lg bg-muted/20">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {schemaItems.length}st kurstillfällen i veckan.
          </p>
        </div>
        <div className="gap-2">
          <AddCourseToSchemaForm allCourses={allCourses} termin={termin} />
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
                termin={termin}
                schemaItems={schemaItems}
                weekday={day}
                key={day}
              />
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}
