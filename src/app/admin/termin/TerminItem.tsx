import { Button } from "@/components/ui/button";
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
import Schema from "./Schema";

interface Props {
  termin: Termin;
}

export default async function TerminItem({ termin }: Props) {
  const schemaItems: SchemaItemWithCourse[] = await getSchemaItems(termin.id);

  const allCourses = await getAllCourses();

  return (
    <div className="p-2 border rounded">
      <Card>
        <CardHeader>
          <div className="w-full lg:flex md:justify-between md:items-start">
            <CardTitle>
              <div>{termin.name}</div>
            </CardTitle>
            <CardDescription>
              Start: {termin.startDate.toLocaleDateString()}
              <br />
              Slut: {termin.endDate.toLocaleDateString()}
            </CardDescription>

            <div className="p-2 flex gap-2">
              <Button variant={"default"}>Ändra</Button>
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
          <Schema schemaItems={schemaItems} />
        </CardContent>
      </Card>
    </div>
  );
}
