/**
 * Money utilities.
 * All monetary values are stored in the database as integers in öre (1/100 SEK).
 * Use these helpers to convert between öre and SEK for display/input.
 */

import type { AppLang } from "@/locales/config-lang";

/**
 * Format an öre amount as a SEK currency string.
 * - `sv` (default): "150 kr" via sv-SE locale.
 * - `en`: "SEK 150" via en-GB locale (kept neutral; we don't convert to GBP).
 *
 * Anything else falls back to Swedish so older call-sites stay readable.
 */
export function formatPrice(ore: number, lang: AppLang = "sv"): string {
  const sek = ore / 100;
  const locale = lang === "en" ? "en-GB" : "sv-SE";
  return sek.toLocaleString(locale, {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/** Convert whole SEK (admin input) to öre for DB storage. e.g. 150 → 15000 */
export function sekToOre(sek: number): number {
  return Math.round(sek * 100);
}

/** Convert öre (from DB) to whole SEK for admin form display. e.g. 15000 → 150 */
export function oreToSek(ore: number): number {
  return Math.round(ore / 100);
}
