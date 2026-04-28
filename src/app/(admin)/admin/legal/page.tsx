import { requireAdmin } from "@/lib/actions/admin";
import { getLegalPages } from "@/lib/actions/legal-actions";
import { LegalPageList } from "./components/LegalPageList";

export default async function Page() {
  await requireAdmin();
  const pages = await getLegalPages();

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-2xl">Juridiskt</span>
      </div>
      <LegalPageList pages={pages} />
    </div>
  );
}
