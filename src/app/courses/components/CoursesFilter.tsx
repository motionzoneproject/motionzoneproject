"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
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
import useDebounce from "@/hooks/useDebounce";

export function CoursesFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const params = useMemo(
    () => new URLSearchParams(searchParams),
    [searchParams],
  );

  const [searchValue, setSearchValue] = useState(params.get("q") || "");
  const debouncedSearchValue = useDebounce(searchValue, 300);

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

  // Update URL when debounced search value changes
  useEffect(() => {
    if (debouncedSearchValue === undefined) return;

    const next = new URLSearchParams(searchParams);

    if (!debouncedSearchValue) {
      next.delete("q");
    } else {
      next.set("q", debouncedSearchValue);
    }

    // Reset to page 1 when search changes
    if (debouncedSearchValue !== (searchParams.get("q") || "")) {
      next.delete("page");
    }

    if (next.toString() !== searchParams.toString()) {
      replace(`${pathname}?${next.toString()}`);
    }
  }, [debouncedSearchValue, searchParams, pathname, replace]);

  return (
    <div className="w-full">
      <div className="text-xl font-bold mb-3">Filter & Sökning</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Search Field */}
        <div className="space-y-1">
          <Label className="text-sm">Sök produktnamn</Label>
          <Input
            type="text"
            placeholder="Sök..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="border-0 ring-1 ring-input"
          />
        </div>

        {/* Product Type Filter */}
        <div className="space-y-1">
          <Label className="text-sm">Produkttyp</Label>
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
        <div className="space-y-1">
          <Label className="text-sm">Åldersgrupp</Label>
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
        <div className="space-y-1">
          <Label className="text-sm">Sortering</Label>
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
    </div>
  );
}
