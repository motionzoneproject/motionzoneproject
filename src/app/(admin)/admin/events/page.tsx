import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/actions/admin";
import prisma from "@/lib/prisma";
import { AddEventBtn } from "./components/AddEventBtn";
import DelEventBtn from "./components/DelEventBtn";
import EditEventBtn from "./components/EditEventBtn";
import ToggleEventStartpageBtn from "./components/ToggleEventStartpageBtn";

export default async function EventsPage() {
  await requireAdmin();
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
                  {event.startDate.toLocaleDateString("sv-SE")}{" "}
                  {event.endDate &&
                    event.endDate.getTime() > event.startDate.getTime() &&
                    ` - ${event.endDate.toLocaleDateString("sv-SE")}`}
                </TableCell>
                <TableCell className="flex justify-end gap-2">
                  <ToggleEventStartpageBtn
                    eventId={event.id}
                    showOnStartpage={event.showOnStartpage}
                  />
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
