import { Calendar } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Termin, Weekday } from "@/generated/prisma/client";
import {
  getAllCourses,
  getSchemaItems,
  type SchemaItemWithCourse,
} from "@/lib/actions/admin";
import DeleteTerminBtn from "./components/DeleteTerminBtn";
import AddCourseToSchemaForm from "./forms/AddCourseToSchemaForm";
import EditTerminForm from "./forms/EditTerminForm";
import Schema from "./Schema";

interface Props {
  termin: Termin;
}

function isTerminActive(termin: Termin): boolean {
  const today = new Date();

  const isAfterStart = today >= termin.startDate;

  const isBeforeEnd = today <= termin.endDate;

  return isAfterStart && isBeforeEnd;
}

export default async function TerminItem({ termin }: Props) {
  const schemaItems: SchemaItemWithCourse[] = await getSchemaItems(termin.id);

  const allCourses = await getAllCourses();

  return (
    <div className="p-2 ">
      <Card>
        <CardHeader>
          <div className="w-full lg:flex md:justify-between md:items-start">
            <CardTitle>
              <div>
                {termin.name}{" "}
                <span className="font-bold">
                  {isTerminActive(termin) && "(AKTIV)"}
                </span>
              </div>
            </CardTitle>

            <div className="p-2 flex gap-2">
              {/* fix: card-action istället? */}
              <AddCourseToSchemaForm
                weekdays={Object.keys(Weekday)}
                allCourses={allCourses}
                termin={termin}
              />
              <EditTerminForm termin={termin} />
              <DeleteTerminBtn terminId={termin.id} />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-2 rounded ">
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center justify-center bg-muted/50 border rounded-md p-2 shadow-sm min-w-[100px]">
                <span className="text-[10px] uppercase text-muted-foreground font-bold">
                  <Calendar className="inline-block" /> Start
                </span>
                <span className="text-sm font-bold">
                  {termin.startDate.toLocaleDateString()}
                </span>
              </div>
              <div className="h-px w-4 bg-border" />{" "}
              {/* En liten horisontell linje emellan */}
              <div className="flex flex-col items-center justify-center bg-muted/50 border rounded-md p-2 shadow-sm min-w-[100px]">
                <span className="text-[10px] uppercase text-muted-foreground font-bold">
                  <Calendar className="inline-block" /> Slut
                </span>
                <span className="text-sm font-bold">
                  {termin.endDate.toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="p-2 text-muted-foreground">
              (statistik kommer...)
            </div>
          </div>

          <br />
          <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
              <AccordionTrigger>Veckoschema</AccordionTrigger>
              <AccordionContent>
                <Schema schemaItems={schemaItems} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
