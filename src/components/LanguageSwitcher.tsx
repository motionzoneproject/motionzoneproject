"use client";

import i18next from "i18next";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { allLangs, defaultLang, normalizeLang } from "@/locales";

export default function LanguageSwitcher() {
  const [currentLang, setCurrentLang] = useState(defaultLang.value);
  const { t } = useTranslation();

  useEffect(() => {
    const stored = document.cookie
      .split("; ")
      .find((row) => row.startsWith("i18nextLng="))
      ?.split("=")[1];
    const nextLang = normalizeLang(stored ?? i18next.resolvedLanguage);

    setCurrentLang(nextLang);
    void i18next.changeLanguage(nextLang);
  }, []);

  function handleChange(value: string) {
    const nextLang = normalizeLang(value);
    setCurrentLang(nextLang);
    localStorage.setItem("i18nextLng", nextLang);
    document.cookie = `i18nextLng=${nextLang}; Path=/; Max-Age=31536000; SameSite=Lax`;
    void i18next.changeLanguage(nextLang);
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
