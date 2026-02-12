import prisma from "@/lib/prisma";
import Events from "./start/Events";
import Features from "./start/Features";
import Hero from "./start/Hero";

export default async function Page() {
  const _events = await prisma.event.findMany();

  return (
    <main className="flex-1 bg-background">
      <Hero />
      <Features />
      <Events events={[]} />
    </main>
  );
}
