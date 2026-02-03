import type { Termin } from "@/generated/prisma/client";
import { getTerminer } from "@/lib/actions/admin";
import { HideOldCheckbox } from "./components/HideOldCheckbox";
import AddTerminForm from "./forms/AddTerminForm";
import TerminItem from "./TerminItem";

// 1. Gå igenom formuläret för att lägga till en termin, dvs jämför med profilsidor.

// 2. Gå igenom formuläret för att lägga till en kurs i en termin, dvs jämför.

// 3. Lägg till ett ändra-kurs i termin formulär.

// 4. Lägg till snyggare detaljer i schemat.

// 5. Lägg till statistik

function isterminOld(termin: Termin): boolean {
  const today = new Date();

  return today > termin.endDate;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ hide?: string }>;
}) {
  const terminer = await getTerminer();

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
            <TerminItem termin={t} key={t.id} />
          ))}
      </div>
    </div>
  );
}
