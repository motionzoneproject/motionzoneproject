"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";

export default function SearchInput() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const params = new URLSearchParams(searchParams);
  // Använd debouncing för att vänta 300ms innan sökningen körs. fix.

  const handleSearch = (term: string) => {
    if (term) {
      params.set("q", term);
    } else {
      params.delete("q");
    }

    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <Input
      className="w-[200px]"
      placeholder="Sök kurser..."
      onChange={(e) => handleSearch(e.target.value)}
      defaultValue={searchParams.get("q")?.toString()} // Behåll befintligt värde
    />
  );
}
