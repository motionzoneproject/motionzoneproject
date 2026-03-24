// StudentsFilter

"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { SearchInput } from "@/components/SearchInput";
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
import type { Course, Product, Termin, User } from "@/generated/prisma/client";

interface Props {
  teachers: User[];
  terminer: Termin[];
  courses: Course[];
  products: Product[];
}

export default function StudentsFilter({
  teachers,
  terminer,
  courses,
  products,
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
      param: "teacher" | "termin" | "course" | "product",
      value?: string | null,
    ): string => {
      if (param === "teacher")
        return teachers.find((t) => t.id === value)?.id ?? "all";

      if (param === "course")
        return courses.find((t) => t.id === value)?.id ?? "all";

      if (param === "product")
        return products.find((t) => t.id === value)?.id ?? "all";

      return terminer.find((t) => t.id === value)?.id ?? "all";
    },
    [teachers, terminer, courses, products],
  );

  const setFilter = useCallback(
    (name: string, term: string) => {
      const next = new URLSearchParams(searchParams);

      // Check if the filter value is actually changing
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
    const sanitize = (key: "teacher" | "termin" | "course" | "product") => {
      const value = next.get(key);
      if (!value) return;
      if (validParam(key, value) === "all") {
        next.delete(key);
      }
    };

    sanitize("teacher");
    sanitize("termin");
    sanitize("course");
    sanitize("product");

    if (next.toString() !== searchParams.toString()) {
      replace(`${pathname}?${next.toString()}`);
    }
  }, [searchParams, pathname, replace, validParam]);

  return (
    <div className="w-full rounded border-2 p-3">
      <div className="text-xl font-bold">Filter</div>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-sm">Sök</Label>
          <SearchInput
            className="w-full"
            placeholder="Sök elev, köpare, kurs eller produkt..."
          />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Lärare</Label>
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

        <div className="space-y-1">
          <Label className="text-sm">Termin</Label>
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
                    {t.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-sm">Kurser</Label>
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
              <SelectValue placeholder="Välj lärare" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Välj kurs</SelectLabel>
                <SelectItem value="all">Alla</SelectItem>
                <SelectSeparator />
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-sm">Produkter</Label>
          <Select
            value={
              params.get("product")
                ? validParam("product", params.get("product"))
                : "all"
            }
            onValueChange={(value) =>
              setFilter("product", value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Välj lärare" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Välj produkt</SelectLabel>
                <SelectItem value="all">Alla</SelectItem>
                <SelectSeparator />
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
