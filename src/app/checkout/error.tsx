"use client";

import Link from "next/link";
import { useEffect } from "react";

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
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4">
      <h2 className="text-xl font-semibold">Något gick fel vid checkout</h2>
      <p className="text-muted-foreground text-center">
        Ett fel uppstod. Din beställning har inte genomförts.
      </p>
      <div className="flex gap-3 mt-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          Försök igen
        </button>
        <Link
          href="/courses"
          className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent"
        >
          Tillbaka till kurser
        </Link>
      </div>
    </div>
  );
}
