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
  const debouncedSearch = useDebounce(searchInput, 300);

  const handleSearch = useCallback(
    (term: string) => {
      if (term === currentQuery) return; // Aaa smart.
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
