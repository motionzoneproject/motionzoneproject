import Events from "./start/Events";
import Features from "./start/Features";
import Hero from "./start/Hero";

export default async function Page() {
  // const events = await prisma.event.findMany(); Så vi fixar event sen (fix)

  return (
    <div className="w-full bg-slate-200 min-h-screen">
      <div className="mx-auto text-center mt-0">
        <Hero />
        <Events events={[]} />
        <Features />
      </div>
    </div>
  );
}
