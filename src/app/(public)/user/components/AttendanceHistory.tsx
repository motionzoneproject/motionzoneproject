"use client";

import { ChevronDown, ChevronUp, ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { MyAttendance } from "@/lib/actions/attendance-actions";
import { formatDateToInputStr } from "@/lib/date-utils";
import { dbToFormTime } from "@/lib/time-convert";
import { normalizeLang } from "@/locales/config-lang";

/**
 * Kundens närvaro, senaste först.
 *
 * Kommer ur närvaroregistret, inte ur bokningarna. En lektion utan markering
 * finns inte med alls: läraren har inte tagit närvaro, och det är inte samma
 * sak som frånvaro.
 */
export function AttendanceHistory({
  attendance,
  initialCount = 8,
}: {
  attendance: MyAttendance[];
  initialCount?: number;
}) {
  const { t, i18n } = useTranslation();
  const lang = normalizeLang(i18n.language);
  const [expanded, setExpanded] = useState(false);

  const present = attendance.filter((a) => a.status === "PRESENT").length;
  const visible = expanded ? attendance : attendance.slice(0, initialCount);

  return (
    <div className="mt-8 space-y-3">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ClipboardCheck className="h-4 w-4" /> {t("user.attendanceTitle")}
        </h3>
        <p className="text-xs text-muted-foreground">
          {attendance.length > 0
            ? t("user.attendanceSummary", {
                present,
                total: attendance.length,
              })
            : t("user.attendanceDescription")}
        </p>
      </div>

      {attendance.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">
          {t("user.attendanceEmpty")}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {visible.map((a) => (
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

      {attendance.length > initialCount && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs text-muted-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              {t("user.attendanceShowLess")}
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              {t("user.attendanceShowAll", { count: attendance.length })}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
