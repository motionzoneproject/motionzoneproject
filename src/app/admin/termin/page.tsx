import { getTermin } from "@/lib/actions/admin";
import AddTerminForm from "./forms/AddTerminForm";
import TerminItem from "./TerminItem";

export default async function Page() {
  const terminer = await getTermin();

  return (
    <div>
      <div className="w-full md:grid md:grid-cols-2 gap-2 p-2">
        <div className="col-span-2 border rounded p-2 flex gap-2">
          <div>
            <span className="font-bold text-2xl">Terminer / scheman</span>
          </div>
          <div>
            <AddTerminForm />
          </div>
          <br />
        </div>
        {terminer.map((t) => (
          <TerminItem termin={t} key={t.id}></TerminItem>
        ))}
      </div>
    </div>
  );
}
