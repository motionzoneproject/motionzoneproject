import { HelpCircleIcon } from "lucide-react";
import Link from "next/link";
import { getSessionData } from "@/lib/actions/sessiondata";
import { getAdminOverview, getTeacherOverview } from "@/lib/admin-overview";
import { endOfStockholmDay, startOfStockholmDay } from "@/lib/date-utils";
import { AdminOverview } from "./components/overview/AdminOverview";
import { TeacherOverview } from "./components/overview/TeacherOverview";

export default async function Page() {
  const sessionData = await getSessionData();
  const user = sessionData?.user;
  if (
    !sessionData ||
    !user ||
    (user.role !== "admin" && user.role !== "teacher")
  ) {
    return null;
  }

  const now = new Date();
  const dayStart = startOfStockholmDay(now);
  const dayEnd = endOfStockholmDay(now);

  // Rollerna får två olika sidor, inte samma sida med saker bortdolda: en
  // lärare ska se sin dag, en admin ska se skolans. Datan hämtas därefter —
  // lärare kör aldrig frågorna om ordrar eller andras lektioner.
  const isTeacher = user.role === "teacher";

  return (
    // Smalare marginal på mobil: p-8 äter ~64px av en 414px-skärm, vilket är
    // vad som fick beloppet i "Utestående" att rinna över sin bricka.
    <div className="space-y-8 p-4 sm:p-8">
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold">Översikt</h1>
        <div className="rounded-full border-2 border-blue-500 p-3 text-center hover:bg-blue-500">
          <Link href="admin-manual.pdf" className="text-sm" target="_blank">
            <HelpCircleIcon className="mx-auto h-8 w-8" />
            Manual
          </Link>
        </div>
      </div>

      {isTeacher ? (
        <TeacherOverview
          data={await getTeacherOverview(user.id, dayStart, dayEnd)}
          today={now}
        />
      ) : (
        <AdminOverview
          data={await getAdminOverview(user.id, dayStart, dayEnd)}
          today={now}
        />
      )}
    </div>
  );
}
