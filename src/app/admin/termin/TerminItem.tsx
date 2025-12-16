import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
            <CardDescription>
              Start: {termin.startDate.toLocaleDateString()}
              <br />
              Slut: {termin.endDate.toLocaleDateString()}
            </CardDescription>

            <div className="p-2 flex gap-2">
              <EditTerminForm termin={termin} />
              <DeleteTerminBtn terminId={termin.id} />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <AddCourseToSchemaForm
            weekdays={Object.keys(Weekday)}
            allCourses={allCourses}
            termin={termin}
          />

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
