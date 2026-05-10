"use client";

import { useRouter } from "next/navigation";
import { allLangs } from "@/locales";
import { useLocales, useTranslate } from "@/locales/use-locales";

export default function LanguageSwitcher() {
  const { currentLang } = useLocales();
  const { onChangeLang } = useTranslate();
  const router = useRouter();

  function handleChange(value: string) {
    onChangeLang(value);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-brand/20 p-0.5">
      {allLangs.map((lang) => {
        const isActive = currentLang.value === lang.value;
        return (
          <button
            key={lang.value}
            type="button"
            onClick={() => handleChange(lang.value)}
            title={lang.label}
            className={`flex items-center justify-center w-10 h-8 rounded-md text-xs p-1 font-medium transition-all duration-200 ${
              isActive
                ? "bg-brand/10 scale-105"
                : "opacity-50 hover:opacity-100 hover:bg-brand/5"
            }`}
            aria-label={`Byt till ${lang.label}`}
            aria-pressed={isActive}
          >
            {lang.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
