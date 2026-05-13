"use client";

import { allLangs } from "@/locales";

interface Props {
  value: string;
  setValue: (val: string) => void;
}

export default function LanguageSwitcherInput({ value, setValue }: Props) {
  function handleChange(value: string) {
    setValue(value);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-brand/20 p-0.5">
      {allLangs.map((lang) => {
        const isActive = value === lang.value;
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
