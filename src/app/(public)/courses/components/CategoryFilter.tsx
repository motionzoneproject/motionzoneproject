"use client";

import { LayoutGrid } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import type { Category } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  categories: Category[];
}

export function CategoryFilter({ categories }: CategoryFilterProps) {
  const { i18n } = useTranslation();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const isEnglish = i18n.language.startsWith("en");

  const activeCategory = searchParams.get("category") || "all";

  const setCategory = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams);

      if (!value || value === "all") {
        next.delete("category");
      } else {
        next.set("category", value);
      }
      next.delete("page");

      const nextQuery = next.toString();
      const currentQuery = searchParams.toString();
      if (nextQuery !== currentQuery) {
        replace(`${pathname}?${nextQuery}`);
      }
    },
    [searchParams, pathname, replace],
  );

  return (
    <div>
      <div className="flex items-center gap-2 my-2 ">
        <div className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 bg-brand/12">
          <LayoutGrid className="w-3.5 h-3.5 text-brand" />
        </div>
        <Label className="text-xs font-medium text-muted-foreground">
          {isEnglish ? "Categories" : "Kategorier"}
        </Label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
            activeCategory === "all"
              ? "bg-brand text-white border-brand"
              : "bg-muted/40 text-muted-foreground border-border hover:bg-muted/70",
          )}
        >
          {isEnglish ? "All courses" : "Alla kurser"}
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setCategory(category.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
              activeCategory === category.id
                ? "bg-brand text-white border-brand"
                : "bg-muted/40 text-muted-foreground border-border hover:bg-muted/70",
            )}
          >
            {isEnglish ? (category.name_en ?? category.name) : category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
