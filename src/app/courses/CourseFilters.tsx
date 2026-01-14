"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import useDebounce from "@/hooks/useDebounce";

interface Props {
  type: string;
  adult: string;
  sort: string;
  q: string;
}

export default function CourseFilters({ type, adult, sort, q }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(q);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Aha smart!
  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams);
      const nextValue = value.trim();
      if (value === "all" || nextValue === "") {
        params.delete(key);
      } else {
        params.set(key, nextValue);
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    if (debouncedSearch === undefined) return;
    if (debouncedSearch === q) return;
    updateParam("q", debouncedSearch);
  }, [debouncedSearch, q, updateParam]);

  return (
    <div className="grid grid-cols-1 gap-3">
      <label className="text-sm text-muted-foreground">
        Sök
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Sök produkt..."
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm text-muted-foreground">
        Produkttyp
        <select
          value={type}
          onChange={(e) => updateParam("type", e.target.value)}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Alla</option>
          <option value="COURSE">Kurs</option>
          <option value="PACK">Paket</option>
          <option value="CLIP">Klippkort</option>
        </select>
      </label>

      <label className="text-sm text-muted-foreground">
        Åldersgrupp
        <select
          value={adult}
          onChange={(e) => updateParam("adult", e.target.value)}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">Alla</option>
          <option value="adult">Vuxen</option>
          <option value="child">Barn/Ungdom</option>
        </select>
      </label>

      <label className="text-sm text-muted-foreground">
        Sortering
        <select
          value={sort}
          onChange={(e) => updateParam("sort", e.target.value)}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="price-asc">Pris (lägsta först)</option>
          <option value="price-desc">Pris (högsta först)</option>
          <option value="name-asc">Namn (A–Ö)</option>
          <option value="name-desc">Namn (Ö–A)</option>
        </select>
      </label>
    </div>
  );
}
