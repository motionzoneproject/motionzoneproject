import type { Course } from "@/generated/prisma/client";

export function getCourseName(course: Course) {
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
  const levelInfo = course.level && ` - ${course.level}`;

  return `${course.name} ${ageRange} ${levelInfo}`;
}
