/**
 * Money utilities.
 * All monetary values are stored in the database as integers in öre (1/100 SEK).
 * Use these helpers to convert between öre and SEK for display/input.
 */

/** Format an öre amount as a Swedish SEK currency string, e.g. 15000 → "150,00 kr" */
export function formatPrice(ore: number): string {
  return (ore / 100).toLocaleString("sv-SE", {
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
