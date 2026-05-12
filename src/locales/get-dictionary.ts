import "server-only";

import { cookies } from "next/headers";

import { normalizeLang } from "./config-lang";
import en from "./langs/en.json";
import sv from "./langs/sv.json";

/**
 * Read the active language from the `i18nextLng` cookie and return both the
 * normalized lang code plus the matching dictionary. Use this from server
 * components so localized strings are included in the initial SSR HTML.
 */
export async function getDictionary() {
  const lang = normalizeLang((await cookies()).get("i18nextLng")?.value);
  return { lang, t: lang === "en" ? en : sv };
}

export type Dictionary = typeof sv;
