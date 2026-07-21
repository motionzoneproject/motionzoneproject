import { TZDate } from "@date-fns/tz";
import { addDays } from "date-fns";

const STOCKHOLM_TIME_ZONE = "Europe/Stockholm";

export function formatDateToInputStr(date: unknown): string {
  if (!date) {
    return "";
  }

  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const formatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone: STOCKHOLM_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const parts = formatter.formatToParts(date);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;

    // Fallback om formatering misslyckas istället för undefined-undefined-undefined
    if (!year || !month || !day) {
      throw new Error(
        `formatDateToInputStr: Kunde inte formatera datum "${date.toISOString()}"`,
      );
    }

    return `${year}-${month}-${day}`;
  }

  if (typeof date === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    const parsedDate = new Date(date);
    if (!Number.isNaN(parsedDate.getTime())) {
      return formatDateToInputStr(parsedDate);
    }
    return date;
  }

  return "";
}

export function calculateAge(dateOfBirth: unknown): number | null {
  if (!dateOfBirth) {
    return null;
  }

  let birthDate: Date;

  if (dateOfBirth instanceof Date) {
    birthDate = dateOfBirth;
  } else if (typeof dateOfBirth === "string") {
    birthDate = new Date(dateOfBirth);
  } else {
    return null;
  }

  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  // Sanity check - orimliga värden (framtida datum, felaktig indata etc.)
  if (age < 0 || age > 150) {
    return null;
  }

  return age;
}

export function formatFriendlyDate(date: Date, locale: string = "sv-SE") {
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: STOCKHOLM_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return formatter.format(date);
}

export function formatFriendlyDateTime(date: Date, locale: string = "sv-SE") {
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: STOCKHOLM_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return formatter.format(date);
}

export function formatLongFriendlyDate(date: Date, locale: string = "sv-SE") {
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: STOCKHOLM_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return formatter.format(date);
}

export function formatLongFriendlyDateTime(
  date: Date,
  locale: string = "sv-SE",
) {
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: STOCKHOLM_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return formatter.format(date);
}

export function parseStockholmDateInput(dateInput: string): Date {
  return new TZDate(`${dateInput}T00:00:00`, STOCKHOLM_TIME_ZONE);
}

export function endOfStockholmDateInput(dateInput: string): Date {
  return new Date(addDays(parseStockholmDateInput(dateInput), 1).getTime() - 1);
}

export function startOfStockholmDay(date: Date): Date {
  return parseStockholmDateInput(formatDateToInputStr(date));
}

export function endOfStockholmDay(date: Date): Date {
  return endOfStockholmDateInput(formatDateToInputStr(date));
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
