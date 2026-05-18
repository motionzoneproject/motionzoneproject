"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-background">
      <section className="border-b border-border py-8 text-center">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl md:text-4xl font-light text-foreground leading-[1.1] tracking-tight mb-2">
            Något gick fel
          </h1>
          <p className="text-muted-foreground">
            Ett fel uppstod. Din beställning har inte genomförts.
          </p>
        </div>
      </section>

      <section className="py-8">
        <div className="flex flex-col items-center gap-3 px-4">
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={() => reset()}
              className="bg-brand hover:bg-brand-light text-white"
            >
              Försök igen
            </Button>
            <Button asChild variant="outline">
              <Link href="/courses">Tillbaka till kurser</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
