import { Accordion } from "@/components/ui/accordion";
import type { Course, Studio, Termin } from "@/generated/prisma/client";
import type { SchemaItemWithCourseStudioLessons } from "@/lib/actions/admin";
import { getWeekdays } from "@/lib/tools";
import AddCourseToSchemaForm from "./forms/AddCourseToSchemaForm";
import SchemaDay from "./SchemaDay";

interface SchemaProps {
  schemaItems: SchemaItemWithCourseStudioLessons[]; // Tar emot alla schemaItems (som har denna terminId) inkl kursdata.
  termin: Termin;
  allCourses: Course[];
  allStudios: Studio[];
  lang: "sv" | "en";
}

export default function Schema({
  schemaItems,
  termin,
  allCourses,
  allStudios,
  lang = "sv",
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
          <AddCourseToSchemaForm
            allCourses={allCourses}
            termin={termin}
            allStudios={allStudios}
          />
        </div>
      </div>
      <div className="p-2">
        {schemaItems.length === 0 ? (
          "Inga kurser i veckoschemat."
        ) : (
          <Accordion type="single" collapsible>
            {weekdays.map((day) => (
              <SchemaDay
                lang={lang}
                allCourses={allCourses}
                allStudios={allStudios}
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
