import type { AppLang } from "@/locales/config-lang";

/**
 * Pick the localized value from a Prisma row that follows the
 * `{field, field_en}` bilingual convention used across the schema.
 *
 * - Returns the `_en` column when `lang === "en"` and the column has content.
 * - Falls back to the Swedish (canonical) column for empty `_en` values so the
 *   English UI never shows blanks while content is still being translated.
 *
 * The return type narrows away non-string members of the column type so React
 * children, alt attributes, etc. accept the value directly. A column typed
 * `string` returns `string`; a column typed `string | null` returns
 * `string | null`. Non-string columns (Date, etc.) are not valid keys.
 */
export function pick<
  T extends Record<string, unknown>,
  K extends keyof T & string,
>(
  row: T,
  key: T[K] extends string | null | undefined ? K : never,
  lang: AppLang,
): Extract<T[K], string | null | undefined> extends never
  ? string
  : Extract<T[K], string | null | undefined> {
  if (lang === "sv") return row[key] as never;
  const enKey = `${key}_en` as keyof T;
  const enValue = row[enKey];
  if (typeof enValue === "string" && enValue.trim().length > 0) {
    return enValue as never;
  }
  return row[key] as never;
}
