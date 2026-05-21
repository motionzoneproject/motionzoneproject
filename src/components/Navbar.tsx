"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import CartIcon from "./CartIcon";
import LanguageSwitcher from "./LanguageSwitcher";
import { ModeToggle } from "./mode-toggle";
import NavBarAuth from "./Navbar-auth";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";

export default function NavBar() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useTranslation();
  const navLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/courses", label: t("nav.courses") },
    { href: "/about", label: t("nav.about") },
    { href: "/gallery", label: t("nav.gallery") },
  ];

  return (
    <header className="w-full sticky top-0 z-50 border-b border-brand/10 bg-background/85 backdrop-blur-xl">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center group">
          <Image
            src="/logo-dark.png"
            alt="MotionZone Växjö"
            width={640}
            height={180}
            className="hidden dark:block h-14 md:h-16 lg:h-20 w-auto transition-opacity group-hover:opacity-80"
            priority
          />
          <Image
            src="/logo-light.png"
            alt="MotionZone Växjö"
            width={640}
            height={180}
            className="block dark:hidden h-14 md:h-16 lg:h-20 w-auto transition-opacity group-hover:opacity-80"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <ul className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 group inline-block hover:bg-brand/8 hover:text-brand ${
                    isActive ? "text-brand" : "text-muted-foreground"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-brand" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <div className="hover:scale-110 transition-transform duration-200 mr-2">
            <CartIcon />
          </div>
          <ModeToggle />
          <LanguageSwitcher />
          <NavBarAuth />
        </div>

        {/* Mobile Actions */}
        <div className="md:hidden flex items-center gap-2">
          <div className="hover:scale-110 transition-transform duration-200 mr-2">
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
              className="w-[85%] max-w-sm p-0 flex flex-col"
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

              {/* Auth + ModeToggle */}
              <div className="px-4 py-4 border-b border-brand/10">
                <NavBarAuth mobile onNavigate={() => setSheetOpen(false)} />
              </div>

              {/* Nav Links */}
              <nav className="flex-1 px-3 py-3">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setSheetOpen(false)}
                      className={`flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 hover:text-brand hover:bg-brand/5 ${
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
