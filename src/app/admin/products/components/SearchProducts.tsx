"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import useDebounce from "@/hooks/useDebounce";

export default function SearchInputProd() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const currentQuery = searchParams.get("q")?.toString() ?? "";
  const [searchInput, setSearchInput] = useState(currentQuery);
  // Debounce för att undvika navigation på varje tangenttryckning.
  const debouncedSearch = useDebounce(searchInput, 300);

  const handleSearch = useCallback(
    (term: string) => {
      // Undvik onödig route-uppdatering om query redan matchar.
      if (term === currentQuery) return;
      const params = new URLSearchParams(searchParams);
      if (term) {
        params.set("q", term);
      } else {
        params.delete("q");
      }

      replace(`${pathname}?${params.toString()}`);
    },
    [currentQuery, pathname, replace, searchParams],
  );

  useEffect(() => {
    // Synka input om URL:en uppdateras via back/forward eller externa filter.
    setSearchInput(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    if (debouncedSearch === undefined) return;
    handleSearch(debouncedSearch);
  }, [debouncedSearch, handleSearch]);

  return (
    <Input
      className="w-[200px]"
      placeholder="Sök..."
      onChange={(e) => setSearchInput(e.target.value)}
      value={searchInput}
    />
  );
}
