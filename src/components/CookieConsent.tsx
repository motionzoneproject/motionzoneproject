"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const COOKIE_CONSENT_KEY = "cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-4 sm:p-6 shadow-lg">
        <p className="text-sm text-muted-foreground mb-4">
          Vi använder cookies för att förbättra din upplevelse på vår webbplats.
          Genom att fortsätta godkänner du vår{" "}
          <Link
            href="/cookiepolicy"
            className="underline text-brand hover:text-brand-light"
          >
            cookiepolicy
          </Link>
          .
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" size="sm" onClick={decline}>
            Avböj
          </Button>
          <Button size="sm" onClick={accept}>
            Godkänn
          </Button>
        </div>
      </div>
    </div>
  );
}
