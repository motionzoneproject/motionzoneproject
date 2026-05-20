"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Course,
  SchemaItem,
  Termin,
  User,
  Weekday,
} from "@/generated/prisma/client";
import { dbToFormTime } from "@/lib/time-convert";
import { getCourseName, getVeckodag } from "@/lib/tools";
import { DatePickerWithRange } from "./DatePicker";

// Som jag tänker nu så kommer vi ha väldigt mycket data här dock, kanske bättre att hämta härifrån via useEffect? Vi börjar väl såhär.
interface Props {
  teachers: User[];
  terminer: Termin[];
  courses: Course[];
  schemaItems: SchemaItem[];
}

export function LecturesFilter({
  teachers,
  courses,
  schemaItems,
  terminer,
}: Props) {
  const searchParams = useSearchParams();

  const pathname = usePathname();
  const { replace } = useRouter();

  const params = useMemo(
    () => new URLSearchParams(searchParams),
    [searchParams],
  );

  const lang = params.get("lang") === "en" ? "en" : "sv";

  const getWeekdayNumber = (d: Weekday) => {
    if (d === "MONDAY") return 0;
    if (d === "TUESDAY") return 1;
    if (d === "WEDNESDAY") return 2;
    if (d === "THURSDAY") return 3;
    if (d === "FRIDAY") return 4;
    if (d === "SATURDAY") return 5;
    if (d === "SUNDAY") return 6;
    return 0;
  };

  const validParam = useCallback(
    (param: string, value?: string | null): string => {
      if (param === "teacher")
        return teachers.find((t) => t.id === value)?.id ?? "all";
      if (param === "termin")
        return terminer.find((t) => t.id === value)?.id ?? "all";
      if (param === "course")
        return courses.find((t) => t.id === value)?.id ?? "all";
      if (param === "schemaitem")
        return schemaItems.find((t) => t.id === value)?.id ?? "all";
      return "all";
    },
    [courses, schemaItems, teachers, terminer],
  );

  const setFilter = useCallback(
    (name: string, term: string) => {
      const next = new URLSearchParams(searchParams);

      // Check if the filter value is actually changing
      // This prevents unnecessary URL updates and page resets
      const currentValue = searchParams.get(name);
      const newValue = !term || term === "all" ? null : term;
      const isChanging = currentValue !== newValue;

      if (!term || term === "all") {
        next.delete(name);
      } else {
        next.set(name, term);
      }

      // Reset to page 1 only when filter value actually changes
      if (isChanging) {
        next.delete("page");
      }

      const nextQuery = next.toString();
      const currentQuery = searchParams.toString();
      if (nextQuery !== currentQuery) {
        replace(`${pathname}?${nextQuery}`);
      }
    },
    [searchParams, pathname, replace],
  );

  useEffect(() => {
    const next = new URLSearchParams(searchParams);

    const sanitize = (key: "teacher" | "termin" | "course" | "schemaitem") => {
      const value = next.get(key);
      if (!value) return;
      if (validParam(key, value) === "all") {
        next.delete(key);
      }
    };

    sanitize("teacher");
    sanitize("termin");
    sanitize("course");
    sanitize("schemaitem");

    const hideold = next.get("hideold");
    if (hideold && hideold !== "true") {
      next.delete("hideold");
    }

    if (next.toString() !== searchParams.toString()) {
      replace(`${pathname}?${next.toString()}`);
    }
  }, [searchParams, pathname, replace, validParam]);

  return (
    <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          Lärare
        </Label>
        <Select
          value={
            params.get("teacher")
              ? validParam("teacher", params.get("teacher"))
              : "all"
          }
          onValueChange={(value) =>
            setFilter("teacher", value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Välj lärare" />
          </SelectTrigger>

          <SelectContent>
            <SelectGroup>
              <SelectLabel>Välj lärare</SelectLabel>
              <SelectItem value={"all"}>Alla</SelectItem>
              <SelectSeparator></SelectSeparator>
              {teachers.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          Termin
        </Label>
        <Select
          value={
            params.get("termin")
              ? validParam("termin", params.get("termin"))
              : "all"
          }
          onValueChange={(value) =>
            setFilter("termin", value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Välj termin" />
          </SelectTrigger>

          <SelectContent>
            <SelectGroup>
              <SelectLabel>Välj termin</SelectLabel>
              <SelectItem value={"all"}>Alla</SelectItem>
              <SelectSeparator></SelectSeparator>
              {terminer.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          Kurs
        </Label>
        <Select
          value={
            params.get("course")
              ? validParam("course", params.get("course"))
              : "all"
          }
          onValueChange={(value) =>
            setFilter("course", value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Välj kurs" />
          </SelectTrigger>

          <SelectContent>
            <SelectGroup>
              <SelectLabel>Välj kurs</SelectLabel>
              <SelectItem value={"all"}>Alla</SelectItem>
              <SelectSeparator></SelectSeparator>
              {courses.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {getCourseName(t, lang)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          Kurstillfälle
        </Label>
        <Select
          value={
            params.get("schemaitem")
              ? validParam("schemaitem", params.get("schemaitem"))
              : "all"
          }
          onValueChange={(value) =>
            setFilter("schemaitem", value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Välj kurs" />
          </SelectTrigger>

          <SelectContent>
            <SelectGroup>
              <SelectLabel>Välj kurstillfälle</SelectLabel>
              <SelectItem value={"all"}>Alla</SelectItem>
              <SelectSeparator></SelectSeparator>
              {schemaItems
                .sort((a, b) => {
                  if (a.weekday !== b.weekday)
                    return (
                      getWeekdayNumber((a.weekday as Weekday) ?? "MONDAY") -
                      getWeekdayNumber((b.weekday as Weekday) ?? "MONDAY")
                    );

                  if (a.timeStart.getTime() !== b.timeStart.getTime())
                    return a.timeStart.getTime() - b.timeStart.getTime();

                  return a.timeEnd.getTime() - b.timeEnd.getTime();
                })
                .map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {getVeckodag(t.weekday).slice(0, 3)}{" "}
                    {dbToFormTime(t.timeStart)} - {dbToFormTime(t.timeEnd)}{" "}
                    {t.courseId &&
                      courses.find((c) => c.id === t.courseId) &&
                      `${getCourseName(courses.find((c) => c.id === t.courseId) as Course, lang)}`}
                  </SelectItem>
                ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          Datum mellan
        </Label>
        <DatePickerWithRange
          filterSetter={setFilter}
          from={params.get("from")}
          to={params.get("to")}
        />
      </div>

      <div>
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          Dölj gamla
        </Label>
        <div className="flex h-9 items-center">
          <Checkbox
            className="h-6 w-6"
            checked={params.get("hideold") === "true"}
            onCheckedChange={(checked) => {
              setFilter("hideold", checked === true ? "true" : "");
            }}
          />
        </div>
      </div>
    </div>
  );
}
