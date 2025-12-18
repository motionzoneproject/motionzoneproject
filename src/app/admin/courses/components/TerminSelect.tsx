"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Termin } from "@/generated/prisma/client";

export function TerminSelect({
  terminer,
  defaultValue,
}: {
  terminer: Termin[];
  defaultValue: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSelect = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "none") {
      params.delete("terminId");
    } else {
      params.set("terminId", value);
    }
    // Uppdaterar URL:en utan att ladda om hela sidan (soft navigation)
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select onValueChange={handleSelect} defaultValue={defaultValue}>
      <SelectTrigger className="min-w-[200px]">
        <SelectValue placeholder="Välj en termin" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Terminer</SelectLabel>
          <SelectItem value="none">Ingen</SelectItem>
          {terminer.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
