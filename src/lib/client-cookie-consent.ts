"use client";

import {
  COOKIE_CONSENT_MAX_AGE_S,
  COOKIE_CONSENT_NAME,
  COOKIE_CONSENT_VERSION,
  type CookieConsentValue,
  parseCookieConsent,
} from "./cookie-consent.shared";
import { formatDateToInputStr } from "./date-utils";

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

const ONE_YEAR_MS = COOKIE_CONSENT_MAX_AGE_S * 1000;

export const OPEN_COOKIE_PREFS_EVENT = "mz:open-cookie-preferences";

function getCookieStore(): CookieStoreLike | undefined {
  return (window as Window & { cookieStore?: CookieStoreLike }).cookieStore;
}

export async function readClientCookieConsent(): Promise<CookieConsentValue | null> {
  const cookieStore = getCookieStore();
  if (cookieStore) {
    const cookie = await cookieStore.get(COOKIE_CONSENT_NAME);
    return parseCookieConsent(cookie?.value);
  }

  const raw = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_CONSENT_NAME}=`))
    ?.split("=")[1];
  return parseCookieConsent(raw);
}

export async function writeClientCookieConsent(
  preferences: boolean,
): Promise<CookieConsentValue> {
  const value: CookieConsentValue = {
    necessary: true,
    preferences,
    accepted_at: formatDateToInputStr(new Date()),
    version: COOKIE_CONSENT_VERSION,
  };
  const encoded = encodeURIComponent(JSON.stringify(value));

  const cookieStore = getCookieStore();
  if (cookieStore) {
    await cookieStore.set({
      name: COOKIE_CONSENT_NAME,
      value: encoded,
      path: "/",
      expires: Date.now() + ONE_YEAR_MS,
      sameSite: "lax",
    });
    return value;
  }

  // biome-ignore lint/suspicious/noDocumentCookie: fallback for browsers without Cookie Store API
  document.cookie = `${COOKIE_CONSENT_NAME}=${encoded}; Path=/; Max-Age=${COOKIE_CONSENT_MAX_AGE_S}; SameSite=Lax`;
  return value;
}
