import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
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
    <div className="p-4 w-full mt-8  gap-4 border-amber-200 border-2 rounded-xl ml-4">
      <div className=" flex justify-between mb-6">
        <h1 className="text-2xl font-bold ml-4 text-center">Kommande events</h1>

        <AddEventBtn />
      </div>
      <div className="w-full mt-2">
        <Table className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Rubrik</TableHead>
              <TableHead className="w-[100px]">Startdatum</TableHead>
              <TableHead className="w-[100px]">Slutdatum</TableHead>
              <TableHead className="w-[100px]">Bild</TableHead>
              <TableHead className="w-[100px]">Länk</TableHead>
              <TableHead className="w-[100px]">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="space-y-6">
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="font-medium">{event.headline}</TableCell>
                <TableCell className="ml-2">
                  {event.startDate.toLocaleString()}
                </TableCell>
                <TableCell className="ml-2">
                  {event.endDate?.toLocaleString()}
                </TableCell>
                <TableCell className="ml-2">{event.imageURL}</TableCell>
                <TableCell className="ml-2">
                  <Link
                    href={`/admin/events/${event.id}`}
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                    title="Visa eventdetaljer"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Visa
                  </Link>
                </TableCell>
                <TableCell className="text-right">
                  {" "}
                  <DelEventBtn eventId={event.id} />
                </TableCell>
                <TableCell className="flex gap-2 justify-end">
                  {/* <Link href={`/admin/events/${event.id}/edit`}>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </Link> */}

                  <EditEventBtn event={event} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 
      <div className="flex  gap-4">
      {events.map((event) => (

        <Card key={event.id} className=" grid grid-rows-2 gap-4 mt-4">
          <CardHeader>
            <CardTitle>{event.headline}</CardTitle>
            <CardDescription><p>{event.description}</p></CardDescription>
            <CardAction>
              <Link href={`/admin/events/${event.id}/edit`}>
                <Button>Edit</Button>
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>Image: {event.imageURL}</p>
            <p>Link: {event.link}</p>

          </CardContent>
          <CardFooter>
            <p>Start: {event.startDate.toLocaleString()}</p>
            <p>End: {event.endDate?.toLocaleString()}</p>
          </CardFooter>
        </Card>




      ))}
      </div> */}
    </div>
  );
}
