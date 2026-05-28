import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Termin } from "@/generated/prisma/client";
import { getTerminer, requireAdmin } from "@/lib/actions/admin";
import { startOfStockholmDay } from "@/lib/date-utils";
import AdminLanguageSwitch from "../components/AdminLanguageSwitch";
import { HideOldCheckbox } from "./components/HideOldCheckbox";
import AddTerminForm from "./forms/AddTerminForm";
import TerminItem from "./TerminItem";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ hide?: string; lang?: string }>;
}) {
  await requireAdmin();
  const terminer = await getTerminer(true);

  function isTerminActive(termin: Termin): boolean {
    const today = startOfStockholmDay(new Date());
    return today >= termin.startDate && today <= termin.endDate;
  }

  function isVisible(termin: Termin): boolean {
    return isTerminActive(termin) && termin.active;
  }

  const params = await searchParams;
  const hide = params.hide || "";

  const lang = params.lang === "en" ? "en" : "sv";

  return (
    <div className=" w-full p-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Terminer och veckoscheman
          </h1>
          <div className="text-sm my-2 w-fit">
            Formulärspråk: <AdminLanguageSwitch value={lang} />
          </div>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl">
            Skapa terminer och hantera veckoscheman för kurserna.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HideOldCheckbox />
          <AddTerminForm />
        </div>
      </div>

      <div className="border rounded-lg w-full mt-2">
        <Table className="min-w-[640px] w-full text-sm">
          <TableHeader>
            <TableRow className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <TableHead className="p-3 text-left">Namn</TableHead>
              <TableHead className="p-3 text-right">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {terminer
              .filter((t) => hide !== "yes" || isVisible(t))
              .map((t) => (
                <TerminItem lang={lang} termin={t} key={t.id} />
              ))}
          </TableBody>
        </Table>
      </div>

      {terminer.filter((t) => hide !== "yes" || isVisible(t)).length === 0 && (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground">Inga terminer hittades.</p>
        </div>
      )}
    </div>
  );
}
