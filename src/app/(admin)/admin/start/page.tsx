import { requireAdmin } from "@/lib/actions/admin";
import { getStartPageContent } from "@/lib/actions/start-page-actions";
import AdminLanguageSwitch from "../components/AdminLanguageSwitch";
import { StartPageForm } from "./components/StartPageForm";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    lang?: string;
  }>;
}) {
  await requireAdmin();

  const content = await getStartPageContent();

  const sp = await searchParams;

  const lang = sp.lang === "en" ? "en" : "sv";

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-bold text-2xl">Startsidan</span>
          <div className="text-sm mt-2 w-fit">
            Formulärspråk: <AdminLanguageSwitch value={lang} />
          </div>
        </div>
      </div>
      <StartPageForm lang={lang} content={content} />
    </div>
  );
}
