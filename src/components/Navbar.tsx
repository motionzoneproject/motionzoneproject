"use client";

import { ChevronDown, Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Category } from "@/generated/prisma/client";
import CartIcon from "./CartIcon";
import LanguageSwitcher from "./LanguageSwitcher";
import { ModeToggle } from "./mode-toggle";
import NavBarAuth from "./Navbar-auth";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";

interface NavBarProps {
  categories: Category[];
}

interface NavLink {
  href: string;
  label: string;
  isCategory: boolean;
  categoryId: string | null;
}

export default function NavBar({ categories }: NavBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language.startsWith("en");

  const activeCategory = searchParams.get("category");

  // Statiska länkar för desktop
  const staticNavLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/about", label: t("nav.about") },
    { href: "/gallery", label: t("nav.gallery") },
  ];

  // Alla länkar (inkl. kategorier) för mobilmenyn i Sheet
  const mobileNavLinks: NavLink[] = [
    { href: "/", label: t("nav.home"), isCategory: false, categoryId: null },
    {
      href: "/courses",
      label: t("nav.allCourses"),
      isCategory: false,
      categoryId: null,
    },
    ...categories.map((category) => ({
      href: `/courses?category=${category.id}`,
      label: isEnglish ? (category.name_en ?? category.name) : category.name,
      isCategory: true,
      categoryId: category.id,
    })),
    {
      href: "/about",
      label: t("nav.about"),
      isCategory: false,
      categoryId: null,
    },
    {
      href: "/gallery",
      label: t("nav.gallery"),
      isCategory: false,
      categoryId: null,
    },
  ];

  const isLinkActive = (href: string, categoryId?: string | null) => {
    if (categoryId) {
      return pathname === "/courses" && activeCategory === categoryId;
    }
    if (href === "/courses") {
      return pathname === "/courses" && !activeCategory;
    }
    return pathname === href;
  };

  const isAnyCourseActive = pathname === "/courses";

  return (
    <header className="w-full sticky top-0 z-50 border-b border-brand/10 bg-background/85 backdrop-blur-xl">
      <nav className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center group shrink-0">
          <Image
            src="/logo-dark.png"
            alt="MotionZone Växjö"
            width={640}
            height={180}
            className="hidden dark:block h-12 lg:h-16 w-auto transition-opacity group-hover:opacity-80"
            priority
          />
          <Image
            src="/logo-light.png"
            alt="MotionZone Växjö"
            width={640}
            height={180}
            className="block dark:hidden h-12 lg:h-16 w-auto transition-opacity group-hover:opacity-80"
            priority
          />
        </Link>

        {/* Desktop Navigation (visas först från xl:) */}
        <ul className="hidden lg:flex items-center gap-1 whitespace-nowrap">
          {/* Hem */}
          <li>
            <Link
              href="/"
              className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-brand/8 hover:text-brand ${
                isLinkActive("/") ? "text-brand" : "text-muted-foreground"
              }`}
            >
              {t("nav.home")}
              {isLinkActive("/") && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-brand" />
              )}
            </Link>
          </li>

          {/* Kurser & Kategorier Dropdown */}
          <li>
            <DropdownMenu>
              <DropdownMenuTrigger
                className={`relative flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 outline-none hover:bg-brand/8 hover:text-brand ${
                  isAnyCourseActive ? "text-brand" : "text-muted-foreground"
                }`}
              >
                <span>{t("nav.courses")}</span>
                <ChevronDown className="w-4 h-4 opacity-70 -mr-4" />
                {isAnyCourseActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-brand" />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem asChild>
                  <Link
                    href="/courses"
                    className={`w-full cursor-pointer font-medium ${
                      isLinkActive("/courses") ? "text-brand" : ""
                    }`}
                  >
                    {t("nav.allCourses")}
                  </Link>
                </DropdownMenuItem>
                {categories.length > 0 && (
                  <div className="h-px bg-border my-1" />
                )}
                {categories.map((cat) => {
                  const label = isEnglish
                    ? (cat.name_en ?? cat.name)
                    : cat.name;
                  const href = `/courses?category=${cat.id}`;
                  const active = isLinkActive(href, cat.id);
                  return (
                    <DropdownMenuItem key={cat.id} asChild>
                      <Link
                        href={href}
                        className={`w-full cursor-pointer ${
                          active ? "text-brand font-medium" : ""
                        }`}
                      >
                        {label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>

          {/* Övriga statiska länkar */}
          {staticNavLinks.slice(1).map((link) => {
            const active = isLinkActive(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-brand/8 hover:text-brand ${
                    active ? "text-brand" : "text-muted-foreground"
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-brand" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Desktop Actions (visas först från xl:) */}
        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <div className="hover:scale-110 transition-transform duration-200 mr-1">
            <CartIcon />
          </div>
          <ModeToggle />
          <LanguageSwitcher />
          <NavBarAuth />
        </div>

        {/* Mobile / Tablet Actions (upp till xl:) */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="hover:scale-110 transition-transform duration-200 mr-1">
            <CartIcon />
          </div>
          <ModeToggle />
          <LanguageSwitcher />

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="w-9 h-9 rounded-lg flex items-center justify-center border border-brand/20 text-foreground hover:border-brand/50 hover:bg-brand/5 transition-all duration-200"
                aria-label={t("nav.openMenu")}
              >
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[85%] max-w-sm p-0 flex flex-col overflow-y-auto"
            >
              <SheetTitle className="sr-only">{t("nav.openMenu")}</SheetTitle>

              {/* Sheet Logo */}
              <div className="px-6 py-5 border-b border-brand/10">
                <Link href="/" onClick={() => setSheetOpen(false)}>
                  <Image
                    src="/logo-dark.png"
                    alt="MotionZone Växjö"
                    width={640}
                    height={180}
                    className="hidden dark:block h-10 w-auto"
                  />
                  <Image
                    src="/logo-light.png"
                    alt="MotionZone Växjö"
                    width={640}
                    height={180}
                    className="block dark:hidden h-10 w-auto"
                  />
                </Link>
              </div>

              {/* Auth */}
              <div className="px-4 py-4 border-b border-brand/10">
                <NavBarAuth mobile onNavigate={() => setSheetOpen(false)} />
              </div>

              {/* Nav Links */}
              <nav className="flex-1 px-3 py-3 space-y-1">
                {mobileNavLinks.map((link) => {
                  const isActive = isLinkActive(link.href, link.categoryId);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setSheetOpen(false)}
                      className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:text-brand hover:bg-brand/5 ${
                        link.isCategory ? "pl-7 text-xs" : ""
                      } ${
                        isActive
                          ? "text-brand bg-brand/5"
                          : "text-muted-foreground"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
