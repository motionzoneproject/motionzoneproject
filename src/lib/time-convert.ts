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

const LOCAL_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/;

/**
 * Tolkar en väggklocktid utan tidszon ("2026-01-01", "2026-01-01T16:15" eller
 * "2026-01-01T16:15:00") som svensk tid och returnerar tidpunkten.
 *
 * new TZDate("2026-01-01T16:15:00", "Europe/Stockholm") räcker inte: strängen
 * tolkas då i serverns tidszon och flyttas sedan, så resultatet blev rätt bara
 * när servern råkade gå på svensk tid — på en server i UTC en timme fel
 * (två på sommaren). Komponenterna tolkas däremot i den angivna zonen.
 *
 * En sträng med egen tidszon ("…Z", "…+02:00") är redan en tidpunkt och
 * tolkas som den är. Ogiltig indata ger ett ogiltigt Date.
 */
export function stockholmLocalToDate(local: string): Date {
  const m = LOCAL_DATE_TIME.exec(local.trim());
  if (!m) return new Date(local);

  const [, y, mo, d, h, mi, sec] = m;
  return new Date(
    new TZDate(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h ?? 0),
      Number(mi ?? 0),
      Number(sec ?? 0),
      "Europe/Stockholm",
    ).getTime(),
  );
}

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

  const zonedDate = stockholmLocalToDate(sanitizedStr);

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
