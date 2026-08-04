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
import type { Category, Course, Termin, User } from "@/generated/prisma/client";
import { getCourseName } from "@/lib/tools";

const productTypes = [
  { value: "COURSE", label: "Kurs" },
  { value: "PACK", label: "Paket" },
  { value: "CLIP", label: "Klippkort" },
] as const;

interface Props {
  teachers: User[];
  terminer: Termin[];
  courses: Course[];
  categories: Category[];
  lang: "sv" | "en";
}

export default function ProductFilter({
  teachers,
  terminer,
  courses,
  categories,
  lang,
}: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const params = useMemo(
    () => new URLSearchParams(searchParams),
    [searchParams],
  );

  const validParam = useCallback(
    (
      param: "teacher" | "termin" | "course" | "cat",
      value?: string | null,
    ): string => {
      if (param === "cat") return value ?? "all";
      if (param === "teacher")
        return teachers.find((t) => t.id === value)?.id ?? "all";
      if (param === "termin")
        return terminer.find((t) => t.id === value)?.id ?? "all";
      return courses.find((c) => c.id === value)?.id ?? "all";
    },
    [teachers, terminer, courses],
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
    const sanitize = (key: "teacher" | "termin" | "course" | "cat") => {
      const value = next.get(key);
      if (!value) return;
      if (validParam(key, value) === "all") {
        next.delete(key);
      }
    };

    sanitize("teacher");
    sanitize("termin");
    sanitize("course");
    sanitize("cat");

    if (next.toString() !== searchParams.toString()) {
      replace(`${pathname}?${next.toString()}`);
    }
  }, [searchParams, pathname, replace, validParam]);

  return (
    <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          Sök
        </Label>
        <SearchInput className="w-full" placeholder="Sök produktnamn..." />
      </div>
      <div>
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          Kategori
        </Label>
        <Select
          value={params.get("cat") ?? "all"}
          onValueChange={(value) =>
            setFilter("cat", value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Välj kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Välj typ</SelectLabel>
              <SelectItem value="all">Alla</SelectItem>
              <SelectSeparator />
              {categories.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {lang === "en" ? t.name_en : t.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          Typ
        </Label>
        <Select
          value={params.get("type") ?? "all"}
          onValueChange={(value) =>
            setFilter("type", value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Välj typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Välj typ</SelectLabel>
              <SelectItem value="all">Alla</SelectItem>
              <SelectSeparator />
              {productTypes.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
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
            <SelectValue placeholder="Välj lärare" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Välj lärare</SelectLabel>
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
            <SelectValue placeholder="Välj termin" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Välj termin</SelectLabel>
              <SelectItem value="all">Alla</SelectItem>
              <SelectSeparator />
              {terminer.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {(lang === "en" ? t.name_en : t.name) ?? "Unknown"}
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
              <SelectItem value="all">Alla</SelectItem>
              <SelectSeparator />
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {getCourseName(c, lang)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 sm:pt-5">
        <Checkbox
          id="showInactiveProducts"
          checked={params.get("showInactive") === "yes"}
          onCheckedChange={(checked) =>
            setFilter("showInactive", checked ? "yes" : "")
          }
        />
        <label
          htmlFor="showInactiveProducts"
          className="cursor-pointer text-sm"
        >
          Visa inaktiva produkter
        </label>
      </div>
    </div>
  );
}
