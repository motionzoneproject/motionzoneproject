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
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Events</h1>
        <AddEventBtn />
      </div>

      <div className="mt-2">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>Rubrik</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead className="text-right">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="font-medium">{event.headline}</TableCell>
                <TableCell>
                  {event.startDate.toLocaleDateString("sv-SE")} {" "}
                  {event.endDate &&
                    event.endDate.getTime() > event.startDate.getTime() &&
                    ` - ${event.endDate.toLocaleDateString("sv-SE")}`}
                </TableCell>
                <TableCell className="flex justify-end gap-2">
                  <EditEventBtn event={event} />
                  <DelEventBtn eventId={event.id} imageURL={event.imageURL} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {events.length === 0 && (
          <div className="text-sm text-muted-foreground p-2 italic">
            Inga events hittades.
          </div>
        )}
      </div>
    </div>
  );
}
