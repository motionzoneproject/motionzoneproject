import "server-only";
import { cookies } from "next/headers";
import {
  COOKIE_CONSENT_NAME,
  type CookieConsentValue,
  parseCookieConsent,
} from "./cookie-consent.shared";

export async function getServerCookieConsent(): Promise<CookieConsentValue | null> {
  const store = await cookies();
  return parseCookieConsent(store.get(COOKIE_CONSENT_NAME)?.value);
}

export {
  COOKIE_CONSENT_MAX_AGE_S,
  COOKIE_CONSENT_NAME,
  COOKIE_CONSENT_VERSION,
  type CookieConsentValue,
  parseCookieConsent,
} from "./cookie-consent.shared";
