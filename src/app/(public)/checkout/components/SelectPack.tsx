"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Course, Weekday } from "@/generated/prisma/client";
import { getCourseName } from "@/lib/tools";
import { normalizeLang } from "@/locales/config-lang";

interface SelectPackProps {
  maxCourses: number;
  courses: (Course & { schemaItems?: { weekday: Weekday }[] })[];
  /** Array of chosen course IDs, e.g. ["id-1", "id-2"] */
  selected: string[];
  onChange: (selected: string[]) => void;
}

const EMPTY = "__none__";

export function SelectPack({
  maxCourses,
  courses,
  selected,
  onChange,
}: SelectPackProps) {
  const { t, i18n } = useTranslation();
  const lang = normalizeLang(i18n.language);

  const slots = Array.from({ length: maxCourses }, (_, i) => selected[i] ?? "");

  const updateSlot = (index: number, value: string) => {
    const nextSlots = [...slots];
    nextSlots[index] = value === "clear" ? "" : value;
    onChange(nextSlots);
  };

  const count = selected.filter(Boolean).length;

  const infoMessage = useMemo(() => {
    if (count === 0) return t("checkout.pack.infoZero");
    if (count < maxCourses)
      return t("checkout.pack.infoLess", { count, maxCourses });
    return t("checkout.pack.infoComplete", { count, maxCourses });
  }, [count, maxCourses, t]);

  const stat: "empty" | "partial" | "complete" =
    count === 0 ? "empty" : count < maxCourses ? "partial" : "complete";

  const statusStyles = {
    empty:
      "border-red-400/60 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300",
    partial:
      "border-amber-400/60 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300",
    complete:
      "border-emerald-400/60 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300",
  } as const;

  const StatusIcon =
    stat === "complete"
      ? CheckCircle2
      : stat === "partial"
        ? Info
        : AlertTriangle;

  return (
    <div className="space-y-3 pt-2 w-full max-w-full overflow-hidden">
      <p className="text-sm text-muted-foreground">
        {t("checkout.pack.instruction", { maxCourses })}
      </p>

      <div className="grid gap-2 w-full">
        {slots.map((currentValue, i) => {
          const id = `slot-${i}`;
          const otherSelected = slots.filter((v, idx) => idx !== i && v !== "");

          return (
            /* min-w-0 här gör att flex-barn tillåts krympa under sin innehållsbredd */
            <div key={id} className="flex items-center gap-2 w-full min-w-0">
              <span className="w-5 shrink-0 text-center text-sm font-medium text-muted-foreground">
                {i + 1}.
              </span>

              {/* min-w-0 på wrapper och trigger förhindrar overflow */}
              <div className="flex-1 min-w-0">
                <Select
                  value={currentValue || EMPTY}
                  onValueChange={(val) =>
                    updateSlot(i, val === EMPTY ? "" : val)
                  }
                >
                  <SelectTrigger className="w-full min-w-0 text-sm [&>span]:line-clamp-1 [&>span]:text-left">
                    <SelectValue placeholder={t("checkout.pack.pick")} />
                  </SelectTrigger>
                  <SelectContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
                    <SelectItem
                      value={EMPTY}
                      className="text-muted-foreground italic text-sm"
                    >
                      {currentValue
                        ? `-- ${t("checkout.pack.clear")} --`
                        : t("checkout.pack.noCourse")}
                    </SelectItem>
                    {courses.map((c) => (
                      <SelectItem
                        key={c.id}
                        value={c.id}
                        className="text-sm"
                        disabled={otherSelected.includes(c.id)}
                      >
                        {getCourseName(c, lang, c.schemaItems)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={`flex items-start gap-2 rounded-md border px-3 py-2 ${statusStyles[stat]}`}
      >
        <StatusIcon className="h-4 w-4 shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">{infoMessage}</p>
      </div>
    </div>
  );
}
