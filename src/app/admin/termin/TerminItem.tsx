import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { type Termin, Weekday } from "@/generated/prisma/client";
import {
  getAllCourses,
  getSchemaItems,
  type SchemaItemWithCourse,
} from "@/lib/actions/admin";
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
          <div className="w-full flex justify-between items-start">
            <CardTitle>
              <div>{termin.name}</div>
            </CardTitle>

            <div className="p-2">
              <Button variant={"default"}>Ändra</Button>
              <Button variant={"destructive"}>Ta bort</Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <CardDescription>
            Start: {termin.startDate.toLocaleDateString()}
            <br />
            Slut: {termin.endDate.toLocaleDateString()}
          </CardDescription>
          <span className="font-bold">Veckoschema:</span>
          <br />
          <Dialog>
            <DialogTrigger asChild>
              <Button variant={"default"} className="bg-green-500">
                Lägg till kurstillfälle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Lägg till kurstillfälle i veckoschemat
                </DialogTitle>
                <DialogDescription>
                  Ange vilken veckodag samt mellan vilka tider du vill lägga in
                  tillfället. Tillfället blir då{" "}
                  <span className="bold">bokningsbart</span> av kunder som köpt
                  tillgång till kursen.
                </DialogDescription>
              </DialogHeader>

              <AddCourseToSchemaForm
                weekdays={Object.keys(Weekday)}
                allCourses={allCourses}
                termin={termin}
              />

              <DialogFooter className="sm:justify-start">
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Close
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <br />
          <br />
          <Schema schemaItems={schemaItems} />
        </CardContent>
      </Card>
    </div>
  );
}
