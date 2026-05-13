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

export function getCourseName(course: CourseLike, lang: "sv" | "en" = "sv") {
  const ageRange =
    course.minAge && course.minAge > 0
      ? `${course.minAge}${
          course.maxAge && course.maxAge > 0
            ? `–${course.maxAge} år` // Använder tankstreck (–) och lägger till " år" här
            : "+ år" // Lägger till "+ år" om maxAge saknas
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

  return `${baseName} ${ageRange} ${levelInfo}`.trim();
}

export function getWeekdays() {
  return [...WEEKDAYS];
}

export const getVeckodag = (day: Weekday, lang: "sv" | "en" = "sv") => {
  switch (day) {
    case "MONDAY":
      return lang === "sv" ? "Måndag" : "Monday";
    case "TUESDAY":
      return lang === "sv" ? "Tisdag" : "Tuesday";
    case "WEDNESDAY":
      return lang === "sv" ? "Onsdag" : "Wednesday";
    case "THURSDAY":
      return lang === "sv" ? "Torsdag" : "Thursday";
    case "FRIDAY":
      return lang === "sv" ? "Fredag" : "Friday";
    case "SATURDAY":
      return lang === "sv" ? "Lördag" : "Saturday";
    case "SUNDAY":
      return lang === "sv" ? "Söndag" : "Sunday";
    default:
      return day; // Returnerar originalsträngen om ingen matchning hittas
  }
};
