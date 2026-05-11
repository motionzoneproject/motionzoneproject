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
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    async function syncLang() {
      const stored = await readClientLangCookie();
      const nextLang = normalizeLang(stored ?? i18next.resolvedLanguage);

      setCurrentLang(nextLang);
      void i18next.changeLanguage(nextLang);
    }

    void syncLang();
  }, []);

  function handleChange(value: string) {
    const nextLang = normalizeLang(value);
    setCurrentLang(nextLang);
    localStorage.setItem("i18nextLng", nextLang);
    void writeClientLangCookie(nextLang);
    void i18next.changeLanguage(nextLang);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-brand/20 p-0.5">
      {allLangs.map((lang) => {
        const isActive = currentLang === lang.value;
        return (
          <button
            key={lang.value}
            type="button"
            onClick={() => handleChange(lang.value)}
            title={lang.label}
            className={`flex items-center justify-center w-8 h-7 rounded-md text-xs font-medium transition-all duration-200 ${
              isActive
                ? "bg-brand/10 scale-105"
                : "opacity-50 hover:opacity-100 hover:bg-brand/5"
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
