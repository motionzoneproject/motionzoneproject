"use client";

import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import { defaultLang } from "./config-lang";
import translationEn from "./langs/en.json";
import translationSe from "./langs/sv.json";

const lng =
  (typeof window !== "undefined" && localStorage.getItem("i18nextLng")) ||
  defaultLang.value;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translations: translationEn },
      sv: { translations: translationSe },
    },
    lng,
    fallbackLng: "sv",
    debug: process.env.NODE_ENV === "development",
    ns: ["translations"],
    defaultNS: "translations",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
