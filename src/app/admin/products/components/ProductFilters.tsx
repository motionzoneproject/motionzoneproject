"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Termin } from "@/generated/prisma/client";

interface Props {
  terminer: Termin[];
}

const sortOptions = [
  { value: "name_asc", label: "Namn (A-Z)" },
  { value: "name_desc", label: "Namn (Z-A)" },
  { value: "price_asc", label: "Pris (lågt-högt)" },
  { value: "price_desc", label: "Pris (högt-lågt)" },
];

export default function ProductFilters({ terminer }: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // Läs in vad som redan är satt:
  const currentType = searchParams.get("type") ?? "all";
  const currentTermin = searchParams.get("termin") ?? "all";
  const currentSort = searchParams.get("sort") ?? "name_asc";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams);
      const nextValue = value === "all" ? "" : value; // All är ju inget filter, därmed "".
      const prevValue = params.get(key) ?? ""; // Läs in förra värdet för att jämföra.
      if (prevValue === nextValue) return; // Ingen ändring!

      // nextValue och prevValue kan ju vara tomma (om all), så antingen set eller delete.
      if (nextValue) {
        params.set(key, nextValue);
      } else {
        params.delete(key);
      }
      replace(`${pathname}?${params.toString()}`);
    },
    [pathname, replace, searchParams],
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={currentType}
        onValueChange={(value) => updateParam("type", value)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Typ" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alla typer</SelectItem>
          <SelectItem value="COURSE">Kurs</SelectItem>
          <SelectItem value="PACK">Paket</SelectItem>
          <SelectItem value="CLIP">Klippkort</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={currentTermin}
        onValueChange={(value) => updateParam("termin", value)}
      >
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Termin" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alla terminer</SelectItem>
          {terminer.map((termin) => (
            <SelectItem key={termin.id} value={termin.id}>
              {termin.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentSort}
        onValueChange={(value) => updateParam("sort", value)}
      >
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Sortera" />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
