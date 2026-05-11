import { Calendar, CheckCircle2, Clock, EyeOffIcon } from "lucide-react";
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
import { TerminScheduleDialogUI } from "./TerminScheduleDialogUI";

interface Props {
  termin: Termin;
  lang: "sv" | "en";
}

function isTerminActive(termin: Termin): boolean {
  const today = new Date();
  return today >= termin.startDate && today <= termin.endDate;
}

export default async function TerminItem({ termin, lang = "sv" }: Props) {
  const schemaItems: SchemaItemWithCourse[] = await getSchemaItems(termin.id);
  const allCourses = await getAllCourses("", true);

  return (
    <TableRow className="align-top">
      <TableCell className="p-3">
        <div className="font-semibold">
          {lang === "en" ? termin.name_en : termin.name}{" "}
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
          <TerminScheduleDialogUI termin={termin} lang={lang}>
            <Schema
              lang={lang}
              allCourses={allCourses}
              termin={termin}
              schemaItems={schemaItems}
            />
          </TerminScheduleDialogUI>
          <EditTerminForm termin={termin} />
          <DeleteTerminBtn terminId={termin.id} />
        </div>
      </TableCell>
    </TableRow>
  );
}
