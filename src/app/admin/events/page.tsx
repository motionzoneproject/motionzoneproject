import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import prisma from "@/lib/prisma";
import { AddEventBtn } from "./components/AddEventBtn";
import DelEventBtn from "./components/DelEventBtn";
import EditEventBtn from "./components/EditEventBtn";

/*

Skapa lägg till och edit formulär:

1. Skapa zod-schema för skapa i validations/adminforms.ts

2. Skapa addBtn och formulär (useForm med zodResolver, defaultValues, onSubmit som anropar action) i components/NewEventForm.tsx och components/AddEventBtn.tsx

3. Skapa server-action i lib/actions/admin.ts som validerar med zod och uppdaterar databasen.

4. Skapa zod-schema för edit i validations/adminforms.ts (om det skiljer sig från skapa med id!)

5. Skapa editBtn och formulär (useForm med zodResolver, defaultValues, onSubmit som anropar action) i components/EditEventForm.tsx och components/EditEventBtn.tsx

6. Skapa server-action i lib/actions/admin.ts som validerar med zod och uppdaterar databasen.

*/

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    orderBy: { startDate: "asc" },
  });

  return (
    <div className="p-4 w-full mt-8 gap-4 ml-4">
      <div className=" flex justify-between mb-6">
        <h1 className="text-2xl font-bold ml-4 text-center">Events</h1>

        <AddEventBtn />
      </div>
      <div className="w-full mt-2">
        <Table className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          <TableHeader>
            <TableRow>
              <TableHead className="w-25">Rubrik</TableHead>
              <TableHead className="w-25">Datum</TableHead>
              <TableHead className="w-25 text-right">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="space-y-6">
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="font-medium">{event.headline}</TableCell>
                <TableCell className="ml-2">
                  {event.startDate.toLocaleDateString("sv-SE")}{" "}
                  {event.endDate &&
                    event.endDate.getTime() > event.startDate.getTime() &&
                    ` - ${event.endDate.toLocaleDateString("sv-SE")}`}
                </TableCell>
                <TableCell className="flex gap-2 justify-end">
                  <EditEventBtn event={event} />
                  <DelEventBtn eventId={event.id} imageURL={event.imageURL} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
