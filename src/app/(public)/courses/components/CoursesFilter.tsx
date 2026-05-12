"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SearchInput } from "@/components/SearchInput";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CoursesFilter() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const params = useMemo(
    () => new URLSearchParams(searchParams),
    [searchParams],
  );

  const setFilter = useCallback(
    (name: string, value: string) => {
      const next = new URLSearchParams(searchParams);

      // Check if the filter value is actually changing
      const currentValue = searchParams.get(name);
      const newValue = !value || value === "all" ? null : value;
      const isChanging = currentValue !== newValue;

      if (!value || value === "all") {
        next.delete(name);
      } else {
        next.set(name, value);
      }

      // Reset to page 1 only when filter value actually changes
      if (isChanging) {
        next.delete("page");
      }

      const nextQuery = next.toString();
      const currentQuery = searchParams.toString();
      if (nextQuery !== currentQuery) {
        replace(`${pathname}?${nextQuery}`);
      }
    },
    [searchParams, pathname, replace],
  );

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Search Field */}
      <div>
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          {t("coursesPage.filter.searchLabel")}
        </Label>
        <SearchInput
          placeholder={t("coursesPage.filter.searchPlaceholder")}
          className="border-0 ring-1 ring-input w-full"
        />
      </div>

      {/* Product Type Filter */}
      <div>
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          {t("coursesPage.filter.typeLabel")}
        </Label>
        <Select
          value={params.get("type") || "all"}
          onValueChange={(value) =>
            setFilter("type", value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={t("coursesPage.filter.typePlaceholder")}
            />
          </SelectTrigger>

          <SelectContent>
            <SelectGroup>
              <SelectLabel>{t("coursesPage.filter.typeGroup")}</SelectLabel>
              <SelectItem value="all">
                {t("coursesPage.filter.typeAll")}
              </SelectItem>
              <SelectSeparator />
              <SelectItem value="COURSE">
                {t("coursesPage.filter.typeCourse")}
              </SelectItem>
              <SelectItem value="PACK">
                {t("coursesPage.filter.typePack")}
              </SelectItem>
              <SelectItem value="CLIP">
                {t("coursesPage.filter.typeClip")}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Age Group Filter */}
      <div>
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          {t("coursesPage.filter.ageLabel")}
        </Label>
        <Select
          value={params.get("adult") || "all"}
          onValueChange={(value) =>
            setFilter("adult", value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("coursesPage.filter.agePlaceholder")} />
          </SelectTrigger>

          <SelectContent>
            <SelectGroup>
              <SelectLabel>{t("coursesPage.filter.ageGroup")}</SelectLabel>
              <SelectItem value="all">
                {t("coursesPage.filter.ageAll")}
              </SelectItem>
              <SelectSeparator />
              <SelectItem value="false">
                {t("coursesPage.filter.ageChild")}
              </SelectItem>
              <SelectItem value="true">
                {t("coursesPage.filter.ageAdult")}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Sorting Filter */}
      <div>
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">
          {t("coursesPage.filter.sortLabel")}
        </Label>
        <Select
          value={params.get("sort") || "name-asc"}
          onValueChange={(value) =>
            setFilter("sort", value === "name-asc" ? "" : value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={t("coursesPage.filter.sortPlaceholder")}
            />
          </SelectTrigger>

          <SelectContent>
            <SelectGroup>
              <SelectLabel>{t("coursesPage.filter.sortGroup")}</SelectLabel>
              <SelectItem value="name-asc">
                {t("coursesPage.filter.sortNameAsc")}
              </SelectItem>
              <SelectItem value="name-desc">
                {t("coursesPage.filter.sortNameDesc")}
              </SelectItem>
              <SelectSeparator />
              <SelectItem value="price-asc">
                {t("coursesPage.filter.sortPriceAsc")}
              </SelectItem>
              <SelectItem value="price-desc">
                {t("coursesPage.filter.sortPriceDesc")}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
