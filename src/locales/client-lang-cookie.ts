"use client";

import type { AppLang } from "./config-lang";

type CookieStoreLike = {
  get(name: string): Promise<{ value?: string } | null>;
  set(options: {
    name: string;
    value: string;
    path?: string;
    expires?: number | Date;
    sameSite?: "lax" | "strict" | "none";
  }): Promise<void>;
};

const LANG_COOKIE_NAME = "i18nextLng";
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

function getCookieStore(): CookieStoreLike | undefined {
  return (window as Window & { cookieStore?: CookieStoreLike }).cookieStore;
}

export async function readClientLangCookie(): Promise<string | undefined> {
  const cookieStore = getCookieStore();
  if (cookieStore) {
    const cookie = await cookieStore.get(LANG_COOKIE_NAME);
    return cookie?.value;
  }

  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LANG_COOKIE_NAME}=`))
    ?.split("=")[1];
}

export async function writeClientLangCookie(lang: AppLang): Promise<void> {
  const cookieStore = getCookieStore();
  if (cookieStore) {
    await cookieStore.set({
      name: LANG_COOKIE_NAME,
      value: lang,
      path: "/",
      expires: Date.now() + ONE_YEAR_MS,
      sameSite: "lax",
    });
    return;
  }

  // biome-ignore lint/suspicious/noDocumentCookie: fallback for browsers without Cookie Store API
  document.cookie = `${LANG_COOKIE_NAME}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
