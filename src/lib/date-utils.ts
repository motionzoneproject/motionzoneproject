export function formatDateToInput(date: unknown): string {
  if (!date) {
    return "";
  }

  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return date.toISOString().split("T")[0] ?? "";
  }

  if (typeof date === "string") {
    return date;
  }

  return "";
}
