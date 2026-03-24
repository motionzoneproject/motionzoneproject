import { getStartPageContent } from "@/lib/actions/start-page-actions";
import { StartPageForm } from "./components/StartPageForm";

export default async function Page() {
  const content = await getStartPageContent();

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-2xl">Startsidan</span>
      </div>
      <StartPageForm content={content} />
    </div>
  );
}
