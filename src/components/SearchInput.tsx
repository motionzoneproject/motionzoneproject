"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import useDebounce from "@/hooks/useDebounce";

interface SearchInputProps {
  placeholder?: string;
  className?: string;
  paramName?: string;
  debounceMs?: number;
}

/**
 * Reusable search input component with debouncing and URL state management
 * @param placeholder - Placeholder text for the input
 * @param className - Additional CSS classes
 * @param paramName - URL parameter name (defaults to "q")
 * @param debounceMs - Debounce delay in milliseconds (defaults to 300)
 */
export function SearchInput({
  placeholder = "Sök...",
  className = "w-[200px]",
  paramName = "q",
  debounceMs = 300,
}: SearchInputProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const [searchValue, setSearchValue] = useState(
    searchParams.get(paramName) || "",
  );
  const debouncedSearchValue = useDebounce(searchValue, debounceMs);

  // Update URL when debounced search value changes
  useEffect(() => {
    if (debouncedSearchValue === undefined) return;

    const params = new URLSearchParams(searchParams);

    if (!debouncedSearchValue) {
      params.delete(paramName);
    } else {
      params.set(paramName, debouncedSearchValue);
    }

    // Reset to page 1 when search changes
    if (debouncedSearchValue !== (searchParams.get(paramName) || "")) {
      params.delete("page");
    }

    if (params.toString() !== searchParams.toString()) {
      replace(`${pathname}?${params.toString()}`);
    }
  }, [debouncedSearchValue, searchParams, pathname, replace, paramName]);

  return (
    <Input
      className={className}
      placeholder={placeholder}
      value={searchValue}
      onChange={(e) => setSearchValue(e.target.value)}
    />
  );
}
