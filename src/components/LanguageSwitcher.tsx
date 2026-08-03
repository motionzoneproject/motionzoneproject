"use client";

import i18next from "i18next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { allLangs, defaultLang, normalizeLang } from "@/locales";
import {
  readClientLangCookie,
  writeClientLangCookie,
} from "@/locales/client-lang-cookie";

export default function LanguageSwitcher() {
  const [currentLang, setCurrentLang] = useState(defaultLang.value);
  const [isLoading, setisloading] = useState(false);
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    async function syncLang() {
      const stored = await readClientLangCookie();
      const nextLang = normalizeLang(stored ?? i18next.resolvedLanguage);

      setCurrentLang(nextLang);
      await i18next.changeLanguage(nextLang);
    }

    setisloading(true);
    syncLang();

    setisloading(false);
  }, []);

  async function handleChange(value: string) {
    setisloading(true);
    const nextLang = normalizeLang(value);
    setCurrentLang(nextLang);
    localStorage.setItem("i18nextLng", nextLang);
    await writeClientLangCookie(nextLang);
    await i18next.changeLanguage(nextLang);
    router.refresh();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setisloading(false);
  }

  return (
    <div className="flex items-center justify-center gap-1 rounded-lg border border-brand/20 bg-muted/40 p-1">
      {allLangs.map((lang) => {
        const isActive = currentLang === lang.value;
        return (
          <button
            key={lang.value}
            type="button"
            disabled={isLoading}
            onClick={() => handleChange(lang.value)}
            title={lang.label}
            className={`flex items-center justify-center w-9 h-7 rounded-md text-xs font-medium transition-all duration-200 ${
              isLoading
                ? "bg-gray-800 text-gray-500"
                : isActive
                  ? "bg-brand text-white shadow-sm scale-105"
                  : "text-muted-foreground opacity-60 hover:opacity-100 hover:bg-brand/10"
            }`}
            aria-label={t("language.switchTo", { language: lang.label })}
            aria-pressed={isActive}
          >
            {lang.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
