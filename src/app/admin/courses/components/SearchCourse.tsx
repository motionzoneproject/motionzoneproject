"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import useDebounce from "@/hooks/useDebounce";

// såhär löste vi det från product:
//  const currentQuery = searchParams.get("q")?.toString() ?? "";
//   const [searchInput, setSearchInput] = useState(currentQuery);
//   // Debounce för att undvika navigation på varje tangenttryckning.
//   const debouncedSearch = useDebounce(searchInput, 300);

//   const handleSearch = useCallback(
//     (term: string) => {
//       // Undvik onödig route-uppdatering om query redan matchar.
//       if (term === currentQuery) return;
//       const params = new URLSearchParams(searchParams);

export default function SearchInput() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const currentQuery = searchParams.get("q")?.toString() ?? "";
  const [searchInput, setSearchInput] = useState(
    searchParams.get("q")?.toString() ?? "",
  );
  const debouncedSearch = useDebounce(searchInput, 300);

  const handleSearch = useCallback(
    (term: string) => {
      if (term === currentQuery) return;
      const params = new URLSearchParams(searchParams);
      if (term) {
        params.set("q", term);
      } else {
        params.delete("q");
      }

      replace(`${pathname}?${params.toString()}`);
    },
    [pathname, replace, searchParams, currentQuery],
  );

  useEffect(() => {
    setSearchInput(searchParams.get("q")?.toString() ?? "");
  }, [searchParams]);

  useEffect(() => {
    if (debouncedSearch === undefined) return;
    handleSearch(debouncedSearch);
  }, [debouncedSearch, handleSearch]);

  return (
    <Input
      className="w-50"
      placeholder="Sök kurser..."
      onChange={(e) => setSearchInput(e.target.value)}
      value={searchInput}
    />
  );
}
