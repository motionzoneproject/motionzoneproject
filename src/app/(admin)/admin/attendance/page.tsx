import { addDays, subDays } from "date-fns";
import type { Metadata } from "next";
import { requireAdminOrTeacher } from "@/lib/actions/admin";
import { getAttendanceDay } from "@/lib/actions/attendance-actions";
import {
  formatDateToInputStr,
  parseStockholmDateInput,
} from "@/lib/date-utils";
import { AttendanceDay } from "./components/AttendanceDay";

export const metadata: Metadata = {
  title: "Närvaro",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Närvaro tas per dag, inte per lektion.
 *
 * Läraren står i studion med telefonen och vill se dagens grupp: kursen, tiden
 * och alla elever på en skärm. Vägen via lektionslistan krävde att man först
 * hittade rätt lektion, öppnade en dialog och lade till en elev i taget.
 */
export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string; teacher?: string }>;
}) {
  await requireAdminOrTeacher();

  const sp = await searchParams;
  const date =
    sp?.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date)
      ? sp.date
      : formatDateToInputStr(new Date());

  const lessons = await getAttendanceDay(date, sp?.teacher);

  const asDate = parseStockholmDateInput(date);
  const heading = {
    weekday: new Intl.DateTimeFormat("sv-SE", {
      weekday: "long",
      timeZone: "Europe/Stockholm",
    }).format(asDate),
    day: new Intl.DateTimeFormat("sv-SE", {
      day: "numeric",
      timeZone: "Europe/Stockholm",
    }).format(asDate),
    month: new Intl.DateTimeFormat("sv-SE", {
      month: "long",
      timeZone: "Europe/Stockholm",
    }).format(asDate),
  };

  return (
    <AttendanceDay
      date={date}
      lessons={lessons}
      previousDate={formatDateToInputStr(subDays(asDate, 1))}
      nextDate={formatDateToInputStr(addDays(asDate, 1))}
      heading={{
        weekday:
          heading.weekday.charAt(0).toUpperCase() + heading.weekday.slice(1),
        day: heading.day,
        month: heading.month,
      }}
    />
  );
}
