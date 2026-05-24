export function formatDateToInputStr(date: unknown): string {
  if (!date) {
    return "";
  }

  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const formatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Stockholm",
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
    return date;
  }

  return "";
}

export function formatFriendlyDate(date: Date) {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return formatter.format(date);
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
