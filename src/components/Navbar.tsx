"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import CartIcon from "./CartIcon";
import { ModeToggle } from "./mode-toggle";
import NavBarAuth from "./Navbar-auth";

const navLinks = [
  { href: "/", label: "Hem" },
  { href: "/courses", label: "Kurser" },
  { href: "/about", label: "Om oss" },
  { href: "/gallery", label: "Galleri" },
];

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

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
          <div className="hover:scale-110 transition-transform duration-200">
            <CartIcon />
          </div>
          <ModeToggle />
          <NavBarAuth />
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center border border-brand/20 text-foreground hover:border-brand/50 hover:bg-brand/5 transition-all duration-200"
          aria-label="Öppna meny"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-brand/10 px-4 py-5 space-y-1 bg-background/97">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center px-4 py-3 rounded-xl text-muted-foreground hover:text-brand hover:bg-brand/5 transition-all duration-200 font-medium"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          <div className="pt-3 border-t border-brand/10 flex items-center justify-between px-4">
            <CartIcon showLabel onClick={() => setMenuOpen(false)} />
            <div className="flex items-center gap-3">
              <NavBarAuth />
              <ModeToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
