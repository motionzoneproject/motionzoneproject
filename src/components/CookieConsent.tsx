"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CookiePreferencesDialog } from "@/components/CookiePreferencesDialog";
import { Button } from "@/components/ui/button";
import {
  OPEN_COOKIE_PREFS_EVENT,
  readClientCookieConsent,
  writeClientCookieConsent,
} from "@/lib/client-cookie-consent";

export function CookieConsent() {
  const { t } = useTranslation();
  const [bannerVisible, setBannerVisible] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    readClientCookieConsent().then((existing) => {
      if (!existing) setBannerVisible(true);
    });

    const handleOpenPrefs = () => setDialogOpen(true);
    window.addEventListener(OPEN_COOKIE_PREFS_EVENT, handleOpenPrefs);
    return () => {
      window.removeEventListener(OPEN_COOKIE_PREFS_EVENT, handleOpenPrefs);
    };
  }, []);

  const acceptAll = async () => {
    await writeClientCookieConsent(true);
    setBannerVisible(false);
  };

  const rejectOptional = async () => {
    await writeClientCookieConsent(false);
    setBannerVisible(false);
  };

  const openCustomize = () => {
    setDialogOpen(true);
  };

  const handleDialogSaved = () => {
    setBannerVisible(false);
  };

  return (
    <>
      {bannerVisible && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="cookie-consent-title"
          className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
        >
          <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-4 sm:p-6 shadow-lg">
            <h2
              id="cookie-consent-title"
              className="text-base font-semibold mb-2"
            >
              {t("consent.title")}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t("consent.body")}{" "}
              <Link
                href="/cookiepolicy"
                className="underline text-brand hover:text-brand-light"
              >
                {t("consent.read_policy")}
              </Link>
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={openCustomize}
                className="sm:order-1"
              >
                {t("consent.customize")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={rejectOptional}
                className="sm:order-2"
              >
                {t("consent.reject_optional")}
              </Button>
              <Button size="sm" onClick={acceptAll} className="sm:order-3">
                {t("consent.accept_all")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <CookiePreferencesDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={handleDialogSaved}
      />
    </>
  );
}
