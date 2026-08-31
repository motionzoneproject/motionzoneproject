import type { Weekday } from "@/generated/prisma/client";

type CourseLike = {
  name: string;
  name_en?: string | null;
  minAge: number | null;
  maxAge: number | null;
  adult: boolean;
  level: string | null;
  level_en?: string | null;
};

const WEEKDAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

const WEEKDAY_LABELS: Record<
  Weekday,
  Record<"sv" | "en", { full: string; short: string }>
> = {
  MONDAY: {
    sv: { full: "Måndag", short: "Mån" },
    en: { full: "Monday", short: "Mon" },
  },
  TUESDAY: {
    sv: { full: "Tisdag", short: "Tis" },
    en: { full: "Tuesday", short: "Tue" },
  },
  WEDNESDAY: {
    sv: { full: "Onsdag", short: "Ons" },
    en: { full: "Wednesday", short: "Wed" },
  },
  THURSDAY: {
    sv: { full: "Torsdag", short: "Tor" },
    en: { full: "Thursday", short: "Thu" },
  },
  FRIDAY: {
    sv: { full: "Fredag", short: "Fre" },
    en: { full: "Friday", short: "Fri" },
  },
  SATURDAY: {
    sv: { full: "Lördag", short: "Lör" },
    en: { full: "Saturday", short: "Sat" },
  },
  SUNDAY: {
    sv: { full: "Söndag", short: "Sön" },
    en: { full: "Sunday", short: "Sun" },
  },
};

export const getWeekdayAsShort = (day: Weekday, lang: "sv" | "en" = "sv") =>
  WEEKDAY_LABELS[day]?.[lang].short ?? day;

export function getCourseName(
  course: CourseLike,
  lang: "sv" | "en" = "sv",
  schemaItems?: { weekday: Weekday }[],
) {
  const siDaysStr = schemaItems
    ? Array.from(new Set(schemaItems.map((si) => si.weekday)))
        .sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b))
        .map((day) => getWeekdayAsShort(day, lang))
        .join(", ")
    : "";

  const ageRange =
    course.minAge && course.minAge > 0
      ? `${course.minAge}${
          course.maxAge && course.maxAge > 0
            ? `–${course.maxAge} ${lang === "sv" ? `år` : `years`}` // Använder tankstreck (–) och lägger till " år" här
            : `+ ${lang === "sv" ? `år` : `years`}` // Lägger till "+ år" om maxAge saknas
        }${course.adult ? (lang === "sv" ? ` / Vuxen` : ` / Adult`) : ""}`
      : course.adult
        ? lang === "sv"
          ? "Vuxen"
          : "Adult" // Om minAge saknas, men adult är true
        : ""; // Om varken minAge eller adult är true
  const levelInfo =
    lang === "sv"
      ? course.level
        ? ` - ${course.level}`
        : ""
      : course.level_en
        ? ` - ${course.level_en}`
        : "";

  const baseName =
    lang === "sv" ? course.name : course.name_en?.trim() || course.name; // Fallback på svenskt namn.

  const parts = [baseName, ageRange, levelInfo]
    .filter(Boolean)
    .map((s) => s.trim());
  const daysPart = siDaysStr ? `(${siDaysStr})` : "";

  return [...parts, daysPart].filter(Boolean).join(" ");
}

export function getWeekdays() {
  return [...WEEKDAYS];
}

export const getVeckodag = (day: Weekday, lang: "sv" | "en" = "sv") =>
  WEEKDAY_LABELS[day]?.[lang].full ?? day;

export function getPayMethodTxt(n: number, lang: "sv" | "en" = "sv") {
  if (lang === "sv")
    return n === 1
      ? "Faktura, hela beloppet"
      : n === 2
        ? "Delbetalning x 2 + 45kr avgift / faktura"
        : "Delbetalning x 3 + 45kr avgift / faktura";
  if (lang === "en")
    return n === 1
      ? "Invoice, full amount"
      : n === 2
        ? "Installments x 2 + 45 SEK fee / invoice"
        : "Installments x 3 + 45 SEK fee / invoice";
}
