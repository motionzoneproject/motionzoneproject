"use client";

// fix: gör detta till en "global" komponent (om vi inte ska ändra admin helt med annat filter osv)

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";

export default function SearchInputProd() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const params = new URLSearchParams(searchParams);
  // Använd debouncing för att vänta 300ms innan sökningen körs. fix.
  // Samt kanske ändra så filtrering sker på databasnivå för bättre prestanda.

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
      placeholder="Sök..."
      onChange={(e) => handleSearch(e.target.value)}
      defaultValue={searchParams.get("q")?.toString()} // Behåll befintligt värde
    />
  );
}
