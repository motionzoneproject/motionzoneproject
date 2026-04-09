"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
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

export function CoursesFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const params = useMemo(
    () => new URLSearchParams(searchParams),
    [searchParams],
  );

  const setFilter = useCallback(
    (name: string, value: string) => {
      const next = new URLSearchParams(searchParams);

      // Check if the filter value is actually changing
      const currentValue = searchParams.get(name);
      const newValue = !value || value === "all" ? null : value;
      const isChanging = currentValue !== newValue;

      if (!value || value === "all") {
        next.delete(name);
      } else {
        next.set(name, value);
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

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Search Field */}
      <div>
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          Sök produktnamn
        </Label>
        <SearchInput
          placeholder="Sök..."
          className="border-0 ring-1 ring-input w-full"
        />
      </div>

      {/* Product Type Filter */}
      <div>
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          Produkttyp
        </Label>
        <Select
          value={params.get("type") || "all"}
          onValueChange={(value) =>
            setFilter("type", value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Välj typ" />
          </SelectTrigger>

          <SelectContent>
            <SelectGroup>
              <SelectLabel>Välj produkttyp</SelectLabel>
              <SelectItem value="all">Alla</SelectItem>
              <SelectSeparator />
              <SelectItem value="COURSE">Kurs</SelectItem>
              <SelectItem value="PACK">Paket</SelectItem>
              <SelectItem value="CLIP">Klippkort</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Age Group Filter */}
      <div>
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          Åldersgrupp
        </Label>
        <Select
          value={params.get("adult") || "all"}
          onValueChange={(value) =>
            setFilter("adult", value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Välj åldersgrupp" />
          </SelectTrigger>

          <SelectContent>
            <SelectGroup>
              <SelectLabel>Välj åldersgrupp</SelectLabel>
              <SelectItem value="all">Alla</SelectItem>
              <SelectSeparator />
              <SelectItem value="false">Barn/Ungdom</SelectItem>
              <SelectItem value="true">Vuxen</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Sorting Filter */}
      <div>
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          Sortering
        </Label>
        <Select
          value={params.get("sort") || "name-asc"}
          onValueChange={(value) =>
            setFilter("sort", value === "name-asc" ? "" : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sortera efter" />
          </SelectTrigger>

          <SelectContent>
            <SelectGroup>
              <SelectLabel>Sortera efter</SelectLabel>
              <SelectItem value="name-asc">Namn (A-Ö)</SelectItem>
              <SelectItem value="name-desc">Namn (Ö-A)</SelectItem>
              <SelectSeparator />
              <SelectItem value="price-asc">Pris (lägst först)</SelectItem>
              <SelectItem value="price-desc">Pris (högst först)</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
