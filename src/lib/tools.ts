type CourseLike = {
  name: string;
  minAge: number | null;
  maxAge: number | null;
  adult: boolean;
  level: string | null;
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

export function getCourseName(course: CourseLike) {
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

export function getWeekdays() {
  return [...WEEKDAYS];
}
