"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";

export default function ShowInactiveCheckbox() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isChecked = searchParams.get("showInactive") === "yes";

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams],
  );

  const handleToggle = (checked: boolean) => {
    const value = checked ? "yes" : "";
    const newQuery = createQueryString("showInactive", value);
    router.push(`?${newQuery}`);
  };

  return (
    <div className="flex gap-2 items-center">
      <Checkbox
        checked={isChecked}
        onCheckedChange={handleToggle}
        id="showInactiveProducts"
      />
      <label
        htmlFor="showInactiveProducts"
        className="text-sm cursor-pointer whitespace-nowrap"
      >
        Visa inaktiva
      </label>
    </div>
  );
}
