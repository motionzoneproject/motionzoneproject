import { TZDate } from "@date-fns/tz";

/**
 * Konverterar ett Date-objekt från databasen till en "HH:MM"-sträng.
 * Garanterar kolon-separering (HH:MM) oavsett Node-version eller serverns ICU-inställningar.
 * @param dateObj Date-objektet från Prisma.
 * @returns Tiden som en sträng (t.ex. "09:30").
 */
export const dbToFormTime = (dateObj: Date): string => {
  const { hours, minutes } = getZonedHoursMinutes(dateObj);

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}`;
};

/**
 * Konverterar en tids- eller datumsträng från frontend till ett komplett Date-objekt
 * som alltid representerar den exakta tidpunkten i svensk tidszon (Europe/Stockholm),
 * oavsett serverns interna klocka.
 * * Hanterar:
 * - Ren tid: "16:15" -> Sparas på basdatum 1970-01-01T16:15:00 i svensk tid.
 * - Ren kalenderdag: "2026-01-01" -> Sparas som midnatt 2026-01-01T00:00:00 i svensk tid.
 * - Full sträng: "1970-01-01T16:15:00" -> Sparas exakt som angivet i svensk tid.
 */
export const formToDbDate = (dateOrTimeString: string): Date => {
  if (!dateOrTimeString || typeof dateOrTimeString !== "string") {
    throw new Error("formToDbDate fick ett tomt eller ogiltigt värde.");
  }

  let sanitizedStr = dateOrTimeString.trim();

  // Scenario 1: Det är en ren tidsträng (t.ex. "16:15" eller "08:00")
  if (sanitizedStr.length === 5 && sanitizedStr.includes(":")) {
    sanitizedStr = `1970-01-01T${sanitizedStr}:00`;
  }
  // Scenario 2: Det är en ren datumsträng (t.ex. "2026-01-01")
  else if (sanitizedStr.length === 10 && !sanitizedStr.includes("T")) {
    sanitizedStr = `${sanitizedStr}T00:00:00`;
  }

  // Skapa ett tidszonssäkrat datumobjekt låst till svensk tid (hanterar DST automatiskt!)

  const timeZone = "Europe/Stockholm";
  const zonedDate = new TZDate(sanitizedStr, timeZone);

  // Om JS-motorn ändå inte kan tolka strängen, kasta ett tydligt fel i terminalen
  if (Number.isNaN(zonedDate.getTime())) {
    throw new Error(
      `formToDbDate kunde inte tolka formatet på: "${dateOrTimeString}"`,
    );
  }

  // Returnera som ett standard JS Date som Prisma-klienten kan spara i databasen
  return new Date(zonedDate.getTime());
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
  const timeZone = "Europe/Stockholm";

  // Konvertera UTC Date till TZDate för Stockholm-tid
  const tzDate = new TZDate(date.getTime(), timeZone);

  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(tzDate);
  const hours = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minutes = Number(parts.find((p) => p.type === "minute")?.value ?? "0");

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error(
      `getZonedHoursMinutes: Kunde inte extrahera tid från "${date.toISOString()}"`,
    );
  }

  return { hours, minutes };
};
