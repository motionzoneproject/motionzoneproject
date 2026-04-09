import { getTerminsStats } from "@/lib/actions/admin-stats";
import prisma from "@/lib/prisma";
import { StatsClient } from "./StatsClient";

export async function StatsPage() {
  const [terminer, initialStats] = await Promise.all([
    prisma.termin.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        startDate: "desc",
      },
    }),
    getTerminsStats(null),
  ]);

  return <StatsClient terminer={terminer} initialStats={initialStats} />;
}
