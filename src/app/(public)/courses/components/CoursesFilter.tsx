"use client";

import {
  ArrowUpDown,
  ChevronDown,
  Package,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
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
import type { Category, Style } from "@/generated/prisma/client";
import { CategoryFilter } from "./CategoryFilter";

interface CoursesFilterProps {
  styles: Style[];
  categories: Category[];
}

export function CoursesFilter({ styles, categories }: CoursesFilterProps) {
  const { t, i18n } = useTranslation();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [open, setOpen] = useState(false);
  const isEnglish = i18n.language.startsWith("en");

  const params = useMemo(
    () => new URLSearchParams(searchParams),
    [searchParams],
  );

  const activeCount = useMemo(() => {
    let count = 0;
    if (searchParams.get("q")) count++;
    if (searchParams.get("style")) count++;
    if (searchParams.get("type")) count++;
    if (searchParams.get("adult")) count++;
    if (searchParams.get("sort") && searchParams.get("sort") !== "name-asc")
      count++;
    return count;
  }, [searchParams]);

  const setFilter = useCallback(
    (name: string, value: string) => {
      const next = new URLSearchParams(searchParams);

      const currentValue = searchParams.get(name);
      const newValue = !value || value === "all" ? null : value;
      const isChanging = currentValue !== newValue;

      if (!value || value === "all") {
        next.delete(name);
      } else {
        next.set(name, value);
      }

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
    <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 p-4 hover:bg-muted/30 transition-colors rounded-2xl"
      >
        <div className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0 bg-brand/15">
          <SlidersHorizontal className="w-3.5 h-3.5 text-brand" />
        </div>
        <span className="text-sm font-semibold text-foreground">
          {t("coursesPage.filter.title")}
        </span>
        {activeCount > 0 && (
          <span className="ml-1 flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white bg-brand">
            {activeCount}
          </span>
        )}
        <ChevronDown
          className="w-4 h-4 text-muted-foreground ml-auto transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {/* Filter content */}
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-border">
          <div>
            <CategoryFilter categories={categories} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mt-3">
            {/* Search Field */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 bg-brand/12">
                  <Search className="w-3.5 h-3.5 text-brand" />
                </div>
                <Label className="text-xs font-medium text-muted-foreground">
                  {t("coursesPage.filter.searchLabel")}
                </Label>
              </div>
              <SearchInput
                placeholder={t("coursesPage.filter.searchPlaceholder")}
                className="border-0 ring-1 ring-input w-full"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 bg-brand/12">
                  <Sparkles className="w-3.5 h-3.5 text-brand" />
                </div>
                <Label className="text-xs font-medium text-muted-foreground">
                  {t("coursesPage.filter.styleLabel")}
                </Label>
              </div>
              <Select
                value={params.get("style") || "all"}
                onValueChange={(value) =>
                  setFilter("style", value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t("coursesPage.filter.stylePlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>
                      {t("coursesPage.filter.styleGroup")}
                    </SelectLabel>
                    <SelectItem value="all">
                      {t("coursesPage.filter.styleAll")}
                    </SelectItem>
                    <SelectSeparator />
                    {styles.map((style) => (
                      <SelectItem key={style.id} value={style.id}>
                        {isEnglish ? (style.name_en ?? style.name) : style.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Product Type Filter */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 bg-brand-secondary/12">
                  <Package className="w-3.5 h-3.5 text-brand-secondary" />
                </div>
                <Label className="text-xs font-medium text-muted-foreground">
                  {t("coursesPage.filter.typeLabel")}
                </Label>
              </div>
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
                    <SelectLabel>
                      {t("coursesPage.filter.typeGroup")}
                    </SelectLabel>
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
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 bg-brand-light/12">
                  <Users className="w-3.5 h-3.5 text-brand-light" />
                </div>
                <Label className="text-xs font-medium text-muted-foreground">
                  {t("coursesPage.filter.ageLabel")}
                </Label>
              </div>
              <Select
                value={params.get("adult") || "all"}
                onValueChange={(value) =>
                  setFilter("adult", value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t("coursesPage.filter.agePlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>
                      {t("coursesPage.filter.ageGroup")}
                    </SelectLabel>
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
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 bg-brand-secondary-light/12">
                  <ArrowUpDown className="w-3.5 h-3.5 text-brand-secondary-light" />
                </div>
                <Label className="text-xs font-medium text-muted-foreground">
                  {t("coursesPage.filter.sortLabel")}
                </Label>
              </div>
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
                    <SelectLabel>
                      {t("coursesPage.filter.sortGroup")}
                    </SelectLabel>
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
        </div>
      )}
    </div>
  );
}
