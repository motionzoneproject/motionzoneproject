"use client";

import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { allLangs, defaultLang } from "./config-lang";

export function useLocales() {
  const locale =
    typeof document !== "undefined"
      ? (document.cookie.match(/locale=([^;]+)/)?.[1] ?? defaultLang.value)
      : defaultLang.value;

  const currentLang =
    allLangs.find((lang) => lang.value === locale) ?? defaultLang;

  return {
    allLangs,
    currentLang,
  };
}

export function useTranslate() {
  const { t, i18n, ready } = useTranslation();

  const onChangeLang = useCallback(
    (newLang: string) => {
      document.cookie = `locale=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
      i18n.changeLanguage(newLang);
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
