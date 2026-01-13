"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface Props {
  type: string;
  adult: string;
  sort: string;
}

export default function CourseFilters({ type, adult, sort }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="grid grid-cols-1 gap-3">
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
