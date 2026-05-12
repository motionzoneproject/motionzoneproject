"use client";

import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  OPEN_COOKIE_PREFS_EVENT,
  readClientCookieConsent,
  writeClientCookieConsent,
} from "@/lib/client-cookie-consent";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

export function CookiePreferencesDialog({
  open,
  onOpenChange,
  onSaved,
}: Props) {
  const { t } = useTranslation();
  const necessaryId = useId();
  const preferencesId = useId();
  const [preferences, setPreferences] = useState(true);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    readClientCookieConsent().then((existing) => {
      if (cancelled) return;
      if (existing) setPreferences(existing.preferences);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const save = async () => {
    await writeClientCookieConsent(preferences);
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("consent.title")}</DialogTitle>
          <DialogDescription>{t("consent.body")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <label
            htmlFor={necessaryId}
            className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-not-allowed opacity-90"
          >
            <Checkbox id={necessaryId} checked disabled />
            <span className="flex flex-col gap-1">
              <span className="text-sm font-medium">
                {t("consent.necessary_label")}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("consent.necessary_desc")}
              </span>
            </span>
          </label>

          <label
            htmlFor={preferencesId}
            className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
          >
            <Checkbox
              id={preferencesId}
              checked={preferences}
              onCheckedChange={(checked) => setPreferences(checked === true)}
            />
            <span className="flex flex-col gap-1">
              <span className="text-sm font-medium">
                {t("consent.preferences_label")}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("consent.preferences_desc")}
              </span>
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("consent.reject_optional")}
          </Button>
          <Button onClick={save}>{t("consent.save_preferences")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function openCookiePreferences(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_PREFS_EVENT));
}
