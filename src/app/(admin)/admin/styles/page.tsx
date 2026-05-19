import { requireAdmin } from "@/lib/actions/admin";
import { getStyles } from "@/lib/actions/style-actions";
import AdminLanguageSwitch from "../components/AdminLanguageSwitch";
import { StyleList } from "./components/StyleList";

interface Props {
  searchParams: Promise<{
    lang?: string;
  }>;
}

export default async function Page({ searchParams }: Props) {
  await requireAdmin();

  const sp = await searchParams;
  const lang = sp.lang === "en" ? "en" : "sv";
  const styles = await getStyles(lang);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-bold text-2xl">Dansstilar</span>

          <div className="mt-3 text-sm w-fit">
            Formulärspråk: <AdminLanguageSwitch value={lang} />
          </div>
        </div>
      </div>

      <StyleList lang={lang} styles={styles} />
    </div>
  );
}
