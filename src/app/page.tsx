// import { Event } from "@/generated/prisma/client"; såhär löser vi det sen.
// import { getEvents } from "@/lib/actions/server-actions";
import { DEFAULT_EVENTS } from "@/lib/events(tabort)";
import Events from "./components/Events";
import Features from "./components/Features";
import Hero from "./components/Hero";
import Testimonials from "./components/Testimonials";

export default async function Page() {
  // const events: Event[] = await getEvents(); // Så här löser vi det sen.

  return (
    <div>
      <Hero />
      <Events events={DEFAULT_EVENTS} />
      <Features />
      <Testimonials />
    </div>
  );
}
