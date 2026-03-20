import GoogleMap from "@/components/google-map";
import { getStartPageContent } from "@/lib/actions/start-page-actions";
import prisma from "@/lib/prisma";
import Events from "./start/Events";
import Features from "./start/Features";
import Hero from "./start/Hero";

export default async function Page() {
  const [events, startPageContent] = await Promise.all([
    prisma.event.findMany(),
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
