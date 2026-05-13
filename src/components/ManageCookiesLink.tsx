"use client";

import { useTranslation } from "react-i18next";
import { openCookiePreferences } from "@/components/CookiePreferencesDialog";

export function ManageCookiesLink() {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={openCookiePreferences}
      className="text-xs text-muted-foreground hover:text-brand transition-colors duration-200"
    >
      {t("consent.manage_link")}
    </button>
  );
}
