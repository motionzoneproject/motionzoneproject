import { requireAdmin } from "@/lib/actions/admin";
import { StatsPage } from "../components/StatsPage";

export default async function Page() {
  await requireAdmin();

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Statistik</h1>

      <StatsPage />
    </div>
  );
}
