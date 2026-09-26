import type { AttendanceLesson } from "@/lib/actions/attendance-actions";

/** "12 elever · 9 närvarande av 12 markerade", eller "inte markerad". */
export function attendanceSummary(lesson: AttendanceLesson): string {
  const marked = lesson.students.filter((s) => s.status !== null).length;
  const present = lesson.students.filter((s) => s.status === "PRESENT").length;
  const count = `${lesson.students.length} ${
    lesson.students.length === 1 ? "elev" : "elever"
  }`;
  return marked > 0
    ? `${count} · ${present} närvarande av ${marked} markerade`
    : `${count} · inte markerad`;
}
