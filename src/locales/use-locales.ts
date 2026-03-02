"use client";

import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { allLangs, defaultLang } from "./config-lang";

export function useLocales() {
  const langStorage =
    typeof window !== "undefined" ? localStorage.getItem("i18nextLng") : null;

  const currentLang =
    allLangs.find((lang) => lang.value === langStorage) || defaultLang;

  return {
    allLangs,
    currentLang,
  };
}

export function useTranslate() {
  const { t, i18n, ready } = useTranslation();

  const onChangeLang = useCallback(
    (newLang: string) => {
      i18n.changeLanguage(newLang);
      if (typeof window !== "undefined") {
        localStorage.setItem("i18nextLng", newLang);
      }
    },
    [i18n],
  );

  return {
    t,
    i18n,
    ready,
    onChangeLang,
  };
}
