export function formatDateToInputStr(date: unknown): string {
  if (!date) {
    return "";
  }

  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    // TILL (Lokal svensk formatering):
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (typeof date === "string") {
    return date;
  }

  return "";
}

// För att visa datum:
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

export const SV_DAYS = [
  "söndag",
  "måndag",
  "tisdag",
  "onsdag",
  "torsdag",
  "fredag",
  "lördag",
];

export const SV_MONTHS = [
  "januari",
  "februari",
  "mars",
  "april",
  "maj",
  "juni",
  "juli",
  "augusti",
  "september",
  "oktober",
  "november",
  "december",
];

export function formatFriendlyDate(date: Date) {
  // OBS: Om du kör detta på klienten, se till att justera för tidszon om date-objektet är i UTC midnatt,
  // eller utgå från lokala metoder om det är ett lokalt klockslag.
  const dayOfWeek = SV_DAYS[date.getDay()];
  const dayOfMonth = date.getDate();
  const month = SV_MONTHS[date.getMonth()];

  return `${dayOfWeek} ${dayOfMonth} ${month}`;
}
