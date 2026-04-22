import GoogleMap from "@/components/google-map";
import { getStartPageContent } from "@/lib/actions/start-page-actions";
import prisma from "@/lib/prisma";
import Events from "./start/Events";
import Features from "./start/Features";
import Hero from "./start/Hero";

export default async function Page() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [events, startPageContent] = await Promise.all([
    prisma.event.findMany({
      where: {
        showOnStartpage: true,
        OR: [
          { endDate: { gte: today } },
          { endDate: null, startDate: { gte: today } },
        ],
      },
      orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
    }),
    getStartPageContent(),
  ]);

  return (
    <div className="flex-1 bg-background">
      <Hero content={startPageContent} />
      <Features content={startPageContent} />
      <Events events={events} />
      <GoogleMap />
    </div>
  );
}
