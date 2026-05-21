import { requireAdmin } from "@/lib/actions/admin";
import { getStudios } from "@/lib/actions/studio-actions";
import AdminLanguageSwitch from "../components/AdminLanguageSwitch";
import { StudiosList } from "./components/StudiosList";

interface Props {
  searchParams: Promise<{
    lang?: string;
  }>;
}

export default async function Page({ searchParams }: Props) {
  await requireAdmin();

  const sp = await searchParams;
  const lang = sp.lang === "en" ? "en" : "sv";
  const studios = await getStudios(lang);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-bold text-2xl">Studios</span>
          <div className="space-y-0">
            <div className="mt-3 text-sm w-fit">Formulärspråk:</div>
            <div className="w-fit">
              <AdminLanguageSwitch value={lang ?? "sv"} />
            </div>
          </div>
        </div>
      </div>

      <StudiosList lang={lang} studios={studios} />
    </div>
  );
}
