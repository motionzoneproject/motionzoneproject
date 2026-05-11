"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import { writeClientLangCookie } from "./client-lang-cookie";
import type { AppLang } from "./config-lang";
import i18n from "./i18n";

type Props = {
  children: React.ReactNode;
  lang: AppLang;
};

export default function LocalizationProvider({ children, lang }: Props) {
  const currentLang = (i18n.resolvedLanguage ?? i18n.language ?? "").slice(
    0,
    2,
  );
  if (currentLang !== lang) {
    void i18n.changeLanguage(lang);
  }

  useEffect(() => {
    localStorage.setItem("i18nextLng", lang);
    void writeClientLangCookie(lang);
  }, [lang]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
