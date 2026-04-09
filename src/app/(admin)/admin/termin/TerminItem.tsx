import {
  Calendar,
  Calendar1Icon,
  CheckCircle2,
  Clock,
  EyeOffIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Termin } from "@/generated/prisma/client";
import {
  getAllCourses,
  getSchemaItems,
  type SchemaItemWithCourse,
} from "@/lib/actions/admin";
import DeleteTerminBtn from "./components/DeleteTerminBtn";
import ToggleTerminActiveBtn from "./components/ToggleTerminActiveBtn";
import EditTerminForm from "./forms/EditTerminForm";
import Schema from "./Schema";

interface Props {
  termin: Termin;
}

function isTerminActive(termin: Termin): boolean {
  const today = new Date();
  return today >= termin.startDate && today <= termin.endDate;
}

export default async function TerminItem({ termin }: Props) {
  const schemaItems: SchemaItemWithCourse[] = await getSchemaItems(termin.id);
  const allCourses = await getAllCourses("", true);

  return (
    <TableRow className="align-top">
      <TableCell className="p-3">
        <div className="font-semibold">
          {termin.name}{" "}
          {!termin.active && (
            <span className="mt-1 inline-flex items-center gap-1 text-xs text-amber-600">
              <EyeOffIcon className="h-3 w-3" />
              Avaktiverad
            </span>
          )}
          {termin.active && isTerminActive(termin) ? (
            <span className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-600">
              <CheckCircle2 className="h-3 w-3" />
              Aktiv
            </span>
          ) : termin.active ? (
            <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Inaktiv
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {termin.startDate.toLocaleDateString()} –{" "}
          {termin.endDate.toLocaleDateString()}
        </div>
      </TableCell>
      <TableCell className="p-3 text-right">
        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-end">
          <ToggleTerminActiveBtn terminId={termin.id} active={termin.active} />
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="cursor-pointer">
                <Calendar1Icon className="h-4 w-4" />
                <span className="sr-only">Visa veckoschema</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {termin.name}
                  <br />
                  veckoschema
                </DialogTitle>
              </DialogHeader>
              <Schema
                allCourses={allCourses}
                termin={termin}
                schemaItems={schemaItems}
              />
            </DialogContent>
          </Dialog>
          <EditTerminForm termin={termin} />
          <DeleteTerminBtn terminId={termin.id} />
        </div>
      </TableCell>
    </TableRow>
  );
}
