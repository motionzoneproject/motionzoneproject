/**
 * Konverterar ett Date-objekt från databasen till en "HH:MM"-sträng.
 * @param dateObj Date-objektet från Prisma.
 * @returns Tiden som en sträng (t.ex. "09:30").
 */
export const dbToFormTime = (dateObj: Date): string => {
  // Använd toLocaleTimeString för att få den lokala tiden (HH:MM)
  return dateObj.toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false, // För att säkerställa 24-timmarsformat
  });
};

/**
 * Konverterar en "HH:MM"-tidsträng till ett komplett Date-objekt
 * genom att använda ett basdatum.
 * @param timeString Tiden som sträng (t.ex. "09:30").
 * @param baseDate Datumet att använda som bas (standard: idag).
 * @returns Ett komplett Date-objekt.
 */
export const formToDbDate = (
  timeString: string,
  baseDate: Date = new Date(),
): Date => {
  const [hours, minutes] = timeString.split(":").map(Number);

  const newDate = new Date(baseDate);

  // Ställ in timmar, minuter, och nollställ sekunder/millisekunder i lokal tid
  newDate.setHours(hours, minutes, 0, 0);

  return newDate;
};
