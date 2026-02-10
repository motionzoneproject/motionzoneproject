"use client";

import { ArrowRight } from "lucide-react";
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
} from "@/generated/prisma/client";
import { getCourseName } from "@/lib/tools";
import { getVeckodag } from "../../termin/SchemaDay";
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
      if (!term || term === "all") {
        next.delete(name);
      } else {
        next.set(name, term);
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
    <div className="w-full p-2 border-2 rounded">
      <div className="font-bold text-xl">Filter</div>
      <div className="flex gap-2 items-center">
        <div className="p-1">
          <Label className="p-1 mb-1">Lärare</Label>
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
        <div className="">
          <ArrowRight />
        </div>
        <div className="p-1">
          <Label className="p-1 mb-1">Termin</Label>
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
        <div className="">
          <ArrowRight />
        </div>
        <div className="p-1">
          <Label className="p-1 mb-1">Kurs</Label>
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
                    {getCourseName(t)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="">
          <ArrowRight />
        </div>
        <div className="p-1">
          <Label className="p-1 mb-1">Kurstillfälle:</Label>
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
                {schemaItems.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {getVeckodag(t.weekday)} kl{" "}
                    {t.timeStart.toLocaleTimeString("sv-SE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -{" "}
                    {t.timeEnd.toLocaleTimeString("sv-SE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="p-1">
          <Label className="p-1 mb-1">Datum mellan:</Label>
          <DatePickerWithRange
            filterSetter={setFilter}
            from={params.get("from")}
            to={params.get("to")}
          />
        </div>

        <div className="p-1">
          <Label className="p-1 mb-1">Dölj gamla</Label>
          <Checkbox
            className="w-8 h-8"
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
