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
import { getCourseName } from "@/lib/tools";

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

    const approval = next.get("approval");
    if (approval && approval !== "approved" && approval !== "unapproved") {
      next.delete("approval");
    }

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
        <SearchInput
          className="w-full"
          placeholder="Sök elev, köpare, kurs eller produkt..."
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
                  {t.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          Kurser
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
            <SelectValue placeholder="Välj lärare" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Välj kurs</SelectLabel>
              <SelectItem value="all">Alla</SelectItem>
              <SelectSeparator />
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {getCourseName(c)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          Produkter
        </Label>
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

      <div>
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          Status
        </Label>
        <Select
          value={params.get("approval") ?? "all"}
          onValueChange={(value) =>
            setFilter("approval", value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Visa" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Visa</SelectLabel>
              <SelectItem value="all">Alla</SelectItem>
              <SelectSeparator />
              <SelectItem value="approved">Beviljade</SelectItem>
              <SelectItem value="unapproved">Obeviljade</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
