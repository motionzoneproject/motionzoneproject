/**
 * Konverterar ett Date-objekt från databasen till en "HH:MM"-sträng.
 * @param dateObj Date-objektet från Prisma.
 * @returns Tiden som en sträng (t.ex. "09:30").
 */
export const dbToFormTime = (dateObj: Date): string => {
  // Använd toLocaleTimeString för att få den lokala tiden (HH:MM)
  return dateObj.toLocaleTimeString("sv-SE", {
    timeZone: "Europe/Stockholm",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false, // För att säkerställa 24-timmarsformat
  });
};

// /**
//  * Konverterar en "HH:MM"-tidsträng till ett komplett Date-objekt
//  * genom att använda ett basdatum.
//  * @param timeString Tiden som sträng (t.ex. "09:30").
//  * @param baseDate Datumet att använda som bas (standard: idag).
//  * @returns Ett komplett Date-objekt.
//  */
// export const formToDbDate = (
//   timeString: string,
//   baseDate: Date = new Date(),
// ): Date => {
//   const [hours, minutes] = timeString.split(":").map(Number);

//   const newDate = new Date(baseDate);

//   // Ställ in timmar, minuter, och nollställ sekunder/millisekunder i lokal tid
//   newDate.setHours(hours, minutes, 0, 0);

//   return newDate;
// };

/**
 * Konverterar en "HH:MM"-tidsträng till ett komplett Date-objekt
 * som alltid representerar den exakta tiden i svensk tidszon,
 * oavsett serverns interna klocka. Sparas som basdatum 1970-01-01.
 * @param timeString Tiden som sträng (t.ex. "16:15").
 * @returns Ett komplett Date-objekt justerat till UTC för Prisma.
 */
export const formToDbDate = (timeString: string): Date => {
  const [hours, minutes] = timeString.split(":").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");

  // Vi använder 1970-01-01 som standardår för schema-mallen.
  const baseDateStr = `1970-01-01T${pad(hours)}:${pad(minutes)}:00`;

  // Eftersom 1970-01-01 var normaltid (vintertid) i Sverige, sätter vi +01:00 explicit.
  return new Date(`${baseDateStr}+01:00`);
};

/**
 * Extraherar timmar och minuter från ett Date-objekt baserat på svensk tidszon.
 * Används i backend-looparna för att säkerställa att klockslaget förblir intakt
 * oavsett vilken månad loopen befinner sig i (sommartid/vintertid).
 * @param date Date-objektet från databasen (timeStart/timeEnd).
 */
export const getZonedHoursMinutes = (
  date: Date,
): { hours: number; minutes: number } => {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const hours = Number(parts.find((p) => p.type === "hour")?.value);
  const minutes = Number(parts.find((p) => p.type === "minute")?.value);

  return { hours, minutes };
};
