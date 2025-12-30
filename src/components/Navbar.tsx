"use client";

import { Menu, ShoppingCart, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
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

  return (
    <header className="w-full bg-background border-b border-brand/20">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          {/* Dark mode logo */}
          <Image
            src="/logo-dark.png"
            alt="MotionZone Växjö"
            width={320}
            height={90}
            className="hidden dark:block h-16 md:h-20 lg:h-24 w-auto"
            priority
          />
          {/* Light mode logo */}
          <Image
            src="/logo-light.png"
            alt="MotionZone Växjö"
            width={320}
            height={90}
            className="block dark:hidden h-16 md:h-20 lg:h-24 w-auto"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-muted-foreground hover:text-brand transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/checkout"
            className="text-muted-foreground hover:text-brand transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
          </Link>
          <ModeToggle />
          <NavBarAuth />
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 text-foreground"
          aria-label="Öppna meny"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-background border-t border-brand/20 px-4 py-4">
          <ul className="space-y-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block text-muted-foreground hover:text-brand transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/checkout"
                className="block text-muted-foreground hover:text-brand transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Varukorg
              </Link>
            </li>
          </ul>
          <div className="mt-4 pt-4 border-t border-brand/20 flex items-center justify-between">
            <NavBarAuth />
            <ModeToggle />
          </div>
        </div>
      )}
    </header>
  );
}
