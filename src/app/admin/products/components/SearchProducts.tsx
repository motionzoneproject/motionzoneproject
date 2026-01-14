"use client";

// fix: gör detta till en "global" komponent (om vi inte ska ändra admin helt med annat filter osv)

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import useDebounce from "@/hooks/useDebounce";

export default function SearchInputProd() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [searchInput, setSearchInput] = useState(
    searchParams.get("q")?.toString() ?? "",
  );
  const debouncedSearch = useDebounce(searchInput, 300);

  const handleSearch = useCallback(
    (term: string) => {
      const params = new URLSearchParams(searchParams);
      if (term) {
        params.set("q", term);
      } else {
        params.delete("q");
      }

      replace(`${pathname}?${params.toString()}`);
    },
    [pathname, replace, searchParams],
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
      className="w-[200px]"
      placeholder="Sök..."
      onChange={(e) => setSearchInput(e.target.value)}
      value={searchInput}
    />
  );
}
