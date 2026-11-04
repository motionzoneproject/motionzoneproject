"use client";

import { ChevronDown, ClipboardCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  loadMoreAttendance,
  type MyAttendance,
} from "@/lib/actions/attendance-actions";
import { formatDateToInputStr } from "@/lib/date-utils";
import { dbToFormTime } from "@/lib/time-convert";
import { normalizeLang } from "@/locales/config-lang";

/** Samma som MY_ATTENDANCE_PAGE i attendance-actions.ts (kan inte exporteras därifrån). */
const PAGE_SIZE = 5;

/**
 * Kundens närvaro, senaste först. Servern skickar de första raderna och
 * summan över allt; "Visa fler" hämtar nästa sida.
 *
 * Kommer ur närvaroregistret, inte ur bokningarna. En lektion utan markering
 * finns inte med alls: läraren har inte tagit närvaro, och det är inte samma
 * sak som frånvaro.
 */
export function AttendanceHistory({
  initial,
  total,
  present,
}: {
  initial: MyAttendance[];
  total: number;
  present: number;
}) {
  const { t, i18n } = useTranslation();
  const lang = normalizeLang(i18n.language);
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();

  const showMore = () => {
    startTransition(async () => {
      const more = await loadMoreAttendance(items.length);
      setItems((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        return [...prev, ...more.filter((a) => !seen.has(a.id))];
      });
    });
  };

  return (
    <div className="mt-8 space-y-3">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ClipboardCheck className="h-4 w-4" /> {t("user.attendanceTitle")}
        </h3>
        <p className="text-xs text-muted-foreground">
          {total > 0
            ? t("user.attendanceSummary", { present, total })
            : t("user.attendanceDescription")}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">
          {t("user.attendanceEmpty")}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2 text-sm"
            >
              <span className="min-w-0">
                <span className="tabular-nums">
                  {formatDateToInputStr(a.startTime)}{" "}
                  {dbToFormTime(a.startTime)}
                </span>
                <span className="ml-2 font-medium">{a.courseName[lang]}</span>
                {a.participantName && (
                  <span className="ml-2 text-muted-foreground">
                    ({a.participantName})
                  </span>
                )}
              </span>
              <span
                className={`text-xs font-semibold ${
                  a.status === "PRESENT"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {a.status === "PRESENT"
                  ? t("user.attendancePresent")
                  : t("user.attendanceAbsent")}
              </span>
            </li>
          ))}
        </ul>
      )}

      {items.length < total && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          className="h-8 gap-1.5 px-2 text-xs text-muted-foreground"
          onClick={showMore}
        >
          <ChevronDown className="h-3.5 w-3.5" />
          {t("user.attendanceShowMore", {
            count: Math.min(PAGE_SIZE, total - items.length),
          })}
        </Button>
      )}
    </div>
  );
}
