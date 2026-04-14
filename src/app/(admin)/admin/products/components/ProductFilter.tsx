"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
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

const productTypes = [
  { value: "COURSE", label: "Kurs" },
  { value: "PACK", label: "Paket" },
  { value: "CLIP", label: "Klippkort" },
] as const;

export default function ProductFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const params = useMemo(
    () => new URLSearchParams(searchParams),
    [searchParams],
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
