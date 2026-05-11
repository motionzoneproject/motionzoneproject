"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { defaultLang } from "./config-lang";
import translationEn from "./langs/en.json";
import translationSe from "./langs/sv.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translations: translationEn },
    sv: { translations: translationSe },
  },
  lng: defaultLang.value,
  fallbackLng: defaultLang.value,
  debug: process.env.NODE_ENV === "development",
  ns: ["translations"],
  defaultNS: "translations",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
