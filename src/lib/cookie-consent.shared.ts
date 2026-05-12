// Pure constants, types, and parsers — no runtime dependencies. Imported by
// both the server-only helper (cookie-consent.ts, which adds next/headers)
// and the client helper (client-cookie-consent.ts). Keeping these here means
// the client bundle never has to drag next/headers in.

export const COOKIE_CONSENT_NAME = "mz_cookie_consent";
export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_MAX_AGE_S = 60 * 60 * 24 * 365; // 1 year

export type CookieConsentValue = {
  necessary: true;
  preferences: boolean;
  accepted_at: string;
  version: number;
};

export function parseCookieConsent(
  raw: string | undefined,
): CookieConsentValue | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(
      decodeURIComponent(raw),
    ) as Partial<CookieConsentValue>;
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.necessary === true &&
      typeof parsed.preferences === "boolean" &&
      typeof parsed.accepted_at === "string" &&
      typeof parsed.version === "number"
    ) {
      return parsed as CookieConsentValue;
    }
    return null;
  } catch {
    return null;
  }
}
