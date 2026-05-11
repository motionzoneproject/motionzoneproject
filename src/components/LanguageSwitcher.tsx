"use client";

import i18next from "i18next";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { allLangs } from "@/locales";

export default function LanguageSwitcher() {
  const [currentLang, setCurrentLang] = useState("sv");
  const { t } = useTranslation();

  useEffect(() => {
    const stored = localStorage.getItem("i18nextLng");
    if (stored) setCurrentLang(stored.slice(0, 2));
    if (stored) i18next.changeLanguage(stored.slice(0, 2));
  }, []);

  function handleChange(value: string) {
    setCurrentLang(value);
    localStorage.setItem("i18nextLng", value);
    i18next.changeLanguage(value);
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
