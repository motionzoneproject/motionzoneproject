import { Button } from "@/components/ui/button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  searchParams: Promise<{
    teacher?: string;
    from?: string;
    to?: string;
    termin?: string;
    course?: string;
    schemaitem?: string;
    status?: string;
  }>;
}

export default async function LecturePage({ searchParams }: Props) {
  const { teacher, from, to, termin, course, schemaitem, status } =
    await searchParams;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Lektioner</h1>
      <br />
      FIlter
      <br />
      <br />
      teacher: {teacher}
      <br />
      from: {from}
      <br />
      to: {to}
      <br />
      termin: {termin}
      <br />
      course: {course}
      <br />
      schemaitem: {schemaitem}
      <br />
      status: {status}
      <br />
      <br />
      <div>
        <Button>Skapa lektioner</Button>
        <Button>Ställ in lektioner</Button>
        <Button>Meddelande</Button>
      </div>
      <div className="mt-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Datum - tid</TableHead>
              <TableHead>Kurs</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">
                2022-10-10 <br />
                14.00 - 15.00
              </TableCell>
              <TableCell>Hip hop 18+</TableCell>
              <TableCell></TableCell>
              <TableCell className="text-right">
                <Button>Hantera</Button>
                <Button>Närvaro</Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
