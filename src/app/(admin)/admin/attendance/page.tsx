import { addDays, subDays } from "date-fns";
import type { Metadata } from "next";
import { requireAdminOrTeacher } from "@/lib/actions/admin";
import { getAttendanceDay } from "@/lib/actions/attendance-actions";
import { getSessionData } from "@/lib/actions/sessiondata";
import {
  formatDateToInputStr,
  parseStockholmDateInput,
} from "@/lib/date-utils";
import prisma from "@/lib/prisma";
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

  // Lärare ser bara sina egna lektioner och behöver inget filter. En admin
  // ser hela skolans dag, och kan smalna av till en lärare.
  const session = await getSessionData();
  const isAdmin = session?.user.role === "admin";

  const teachers = isAdmin
    ? await prisma.user.findMany({
        where: { role: { in: ["admin", "teacher"] } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

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
      teachers={teachers}
      selectedTeacher={sp?.teacher ?? ""}
    />
  );
}
