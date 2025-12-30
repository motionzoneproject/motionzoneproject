"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <p className="text-brand font-bold tracking-wider uppercase text-2xl md:text-3xl lg:text-4xl">
            Välkommen till Motion Zone
          </p>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight">
            Dans är Passion
            <br />
            <span className="text-brand-secondary">Och Livet i Rörelse</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Upplev dansen på ett helt nytt sätt. Vår studio erbjuder kurser för
            alla åldrar och nivåer med professionella instruktörer.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              asChild
              size="lg"
              className="bg-brand hover:bg-brand-light text-white px-8"
            >
              <Link href="/courses">Se Våra Kurser</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-brand-secondary text-brand-secondary hover:bg-brand-secondary/10"
            >
              <Link href="/about">Om Oss</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
