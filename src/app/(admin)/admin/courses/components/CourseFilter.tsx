"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { SearchInput } from "@/components/SearchInput";
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
import type { Termin, User } from "@/generated/prisma/client";

interface Props {
  teachers: User[];
  terminer: Termin[];
  lang?: string;
}

export default function CourseFilter({
  teachers,
  terminer,
  lang = "sv",
}: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const params = useMemo(
    () => new URLSearchParams(searchParams),
    [searchParams],
  );

  const validParam = useCallback(
    (param: "teacher" | "termin", value?: string | null): string => {
      if (param === "teacher") {
        return teachers.find((t) => t.id === value)?.id ?? "all";
      }
      return terminer.find((t) => t.id === value)?.id ?? "all";
    },
    [teachers, terminer],
  );

  const setFilter = useCallback(
    (name: string, term: string) => {
      const next = new URLSearchParams(searchParams);

      const currentValue = searchParams.get(name);
      const newValue = !term || term === "all" ? null : term;
      const isChanging = currentValue !== newValue;

      if (!term || term === "all") {
        next.delete(name);
      } else {
        next.set(name, term);
      }

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
    const sanitize = (key: "teacher" | "termin") => {
      const value = next.get(key);
      if (!value) return;
      if (validParam(key, value) === "all") {
        next.delete(key);
      }
    };

    sanitize("teacher");
    sanitize("termin");

    if (next.toString() !== searchParams.toString()) {
      replace(`${pathname}?${next.toString()}`);
    }
  }, [searchParams, pathname, replace, validParam]);

  return (
    <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          Sök
        </Label>
        <SearchInput
          className="w-full"
          placeholder={
            lang === "en" ? "Search course name..." : "Sok kursnamn..."
          }
        />
      </div>
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
            <SelectValue placeholder="Valj larare" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Valj lärare</SelectLabel>
              <SelectItem value="all">Alla</SelectItem>
              <SelectSeparator />
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
            <SelectValue placeholder="Valj termin" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Valj termin</SelectLabel>
              <SelectItem value="all">Alla</SelectItem>
              <SelectSeparator />
              {terminer.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {lang === "en" ? t.name2 || t.name : t.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 sm:pt-5">
        <Checkbox
          id="showInactiveCourses"
          checked={params.get("showInactive") === "yes"}
          onCheckedChange={(checked) =>
            setFilter("showInactive", checked ? "yes" : "")
          }
        />
        <label htmlFor="showInactiveCourses" className="cursor-pointer text-sm">
          Visa inaktiva kurser
        </label>
      </div>
    </div>
  );
}
