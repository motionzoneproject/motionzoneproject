import { TZDate } from "@date-fns/tz";
import { differenceInYears, format, isValid } from "date-fns";
import { enGB, type Locale, sv } from "date-fns/locale";
import { stockholmLocalToDate } from "./time-convert";

const STOCKHOLM_TIME_ZONE = "Europe/Stockholm";

const LOCALES: Record<string, Locale> = {
  "sv-SE": sv,
  "en-GB": enGB,
};

function resolveLocale(locale: string): Locale {
  return LOCALES[locale] ?? sv;
}

export function formatDateToInputStr(
  date: Date | string | null | undefined,
): string {
  if (!date) {
    return "";
  }

  if (typeof date === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }

    const parsed = new Date(date);
    if (!isValid(parsed)) {
      return "";
    }
    date = parsed;
  }

  if (!isValid(date)) {
    return "";
  }

  const tzDate = new TZDate(date, STOCKHOLM_TIME_ZONE);
  return format(tzDate, "yyyy-MM-dd");
}

export function calculateAge(
  dateOfBirth: Date | string | null | undefined,
): number | null {
  if (!dateOfBirth) {
    return null;
  }

  const birthDate =
    dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);

  if (!isValid(birthDate)) {
    return null;
  }

  const age = differenceInYears(new Date(), birthDate);

  if (age < 0 || age > 150) {
    return null;
  }

  return age;
}

export function formatFriendlyDate(date: Date, locale: string = "sv-SE") {
  const tzDate = new TZDate(date, STOCKHOLM_TIME_ZONE);
  return format(tzDate, "EEEE d MMMM", { locale: resolveLocale(locale) });
}

export function formatFriendlyDateTime(date: Date, locale: string = "sv-SE") {
  const tzDate = new TZDate(date, STOCKHOLM_TIME_ZONE);
  return format(tzDate, "EEEE d MMMM HH:mm", {
    locale: resolveLocale(locale),
  });
}

export function formatLongFriendlyDate(date: Date, locale: string = "sv-SE") {
  const tzDate = new TZDate(date, STOCKHOLM_TIME_ZONE);
  return format(tzDate, "EEEE d MMMM yyyy", { locale: resolveLocale(locale) });
}

export function formatLongFriendlyDateTime(
  date: Date,
  locale: string = "sv-SE",
) {
  const tzDate = new TZDate(date, STOCKHOLM_TIME_ZONE);
  return format(tzDate, "EEEE d MMMM yyyy HH:mm", {
    locale: resolveLocale(locale),
  });
}

export function parseStockholmDateInput(dateInput: string): Date {
  return stockholmLocalToDate(dateInput);
}

export function endOfStockholmDateInput(dateInput: string): Date {
  // Nästa kalenderdag räknas på datumet, inte genom att lägga till 24
  // timmar: dagarna då sommartiden börjar och slutar är 23 och 25 timmar.
  // addDays på ett vanligt Date räknade i serverns tidszon och blev fel en
  // timme på de dagarna när servern inte gick på svensk tid.
  const [y, m, d] = dateInput.split("-").map(Number);
  const nextDay = new Date(Date.UTC(y, m - 1, d + 1))
    .toISOString()
    .slice(0, 10);
  return new Date(parseStockholmDateInput(nextDay).getTime() - 1);
}

export function startOfStockholmDay(date: Date): Date {
  return parseStockholmDateInput(formatDateToInputStr(date));
}

export function endOfStockholmDay(date: Date): Date {
  return endOfStockholmDateInput(formatDateToInputStr(date));
}

export function formatShortFriendlyDate(date: Date, locale: string = "sv-SE") {
  const tzDate = new TZDate(date, STOCKHOLM_TIME_ZONE);
  return format(tzDate, "d MMM yyyy", { locale: resolveLocale(locale) });
}

export const MONTHS_SHORT_SV = [
  "jan",
  "feb",
  "mar",
  "apr",
  "maj",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];
