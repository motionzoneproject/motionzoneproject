import { requireAdmin } from "@/lib/actions/admin";
import { getLegalPages } from "@/lib/actions/legal-actions";
import AdminLanguageSwitch from "../components/AdminLanguageSwitch";
import { LegalPageList } from "./components/LegalPageList";

interface Props {
  searchParams: Promise<{
    lang?: string;
  }>;
}

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;

  await requireAdmin();
  const pages = await getLegalPages();

  const lang = sp.lang === "en" ? "en" : "sv";

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-bold text-2xl">Juridiskt</span>
          <br />
          <div className="space-y-0">
            <div className="mt-3 text-sm w-fit">Formulärspråk:</div>
            <div className="w-fit">
              <AdminLanguageSwitch value={lang ?? "sv"} />
            </div>
          </div>
        </div>
      </div>
      <LegalPageList lang={lang} pages={pages} />
    </div>
  );
}
