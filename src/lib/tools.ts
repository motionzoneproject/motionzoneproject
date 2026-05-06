import type { Weekday } from "@/generated/prisma/client";

type CourseLike = {
  name: string;
  name2?: string | null;
  minAge: number | null;
  maxAge: number | null;
  adult: boolean;
  level: string | null;
  level2?: string | null;
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
        }${course.adult ? ` / Vuxen` : ""}`
      : course.adult
        ? "Vuxen" // Om minAge saknas, men adult är true
        : ""; // Om varken minAge eller adult är true
  const levelInfo =
    lang === "sv"
      ? course.level
        ? ` - ${course.level}`
        : ""
      : course.level2
        ? ` - ${course.level2}`
        : "";

  const baseName =
    lang === "sv" ? course.name : course.name2?.trim() || course.name; // Fallback på svenskt namn.

  return `${baseName} ${ageRange} ${levelInfo}`.trim();
}

export function getWeekdays() {
  return [...WEEKDAYS];
}

export const getVeckodag = (day: Weekday) => {
  switch (day) {
    case "MONDAY":
      return "Måndag";
    case "TUESDAY":
      return "Tisdag";
    case "WEDNESDAY":
      return "Onsdag";
    case "THURSDAY":
      return "Torsdag";
    case "FRIDAY":
      return "Fredag";
    case "SATURDAY":
      return "Lördag";
    case "SUNDAY":
      return "Söndag";
    default:
      return day; // Returnerar originalsträngen om ingen matchning hittas
  }
};
