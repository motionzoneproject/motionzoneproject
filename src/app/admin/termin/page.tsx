import type { Termin } from "@/generated/prisma/client";
import { getTermin } from "@/lib/actions/admin";
import { HideOldCheckbox } from "./components/HideOldCheckbox";
import AddTerminForm from "./forms/AddTerminForm";
import TerminItem from "./TerminItem";

function isterminOld(termin: Termin): boolean {
  const today = new Date();

  return today > termin.endDate;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ hide?: string }>;
}) {
  const terminer = await getTermin();

  const params = await searchParams;
  const hide = params.hide || "";

  return (
    <div>
      <div className="w-full md:grid md:grid-cols-2 gap-2 p-2">
        <div className="col-span-2 flex gap-2 items-center">
          <div>
            <span className="font-bold text-2xl">
              Terminer och veckoscheman
            </span>
          </div>

          <div>
            <HideOldCheckbox />
          </div>

          <div>
            <AddTerminForm />
          </div>
        </div>
        {terminer
          .filter((t) => hide !== "yes" || !isterminOld(t))
          .map((t) => (
            <TerminItem termin={t} key={t.id}></TerminItem>
          ))}
      </div>
    </div>
  );
}
