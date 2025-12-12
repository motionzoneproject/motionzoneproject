"use client";

import { Globe, Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";

interface NavigationProps {
  isDark: boolean;
  setIsDark: (value: boolean) => void;
}

export default function Navigation({ isDark, setIsDark }: NavigationProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className={`sticky top-0 z-50 shadow-2xl backdrop-blur-md border-b transition-colors duration-300 ${
        isDark
          ? "bg-slate-900/95 text-white border-purple-500/20"
          : "bg-white text-gray-900 border-gray-200"
      }`}
    >
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-8 py-6">
        <div className="flex items-center gap-4">
          <img
            src="/LogoGirl.png"
            alt="Motion Zone Logo"
            className="h-16 w-16 object-contain"
          />
          <div className="text-4xl md:text-4xl font-bold tracking-tight cursor-pointer transition-all duration-300 hover:opacity-80">
            <span className={isDark ? "text-white" : "text-gray-900"}>
              Motion
            </span>
            <span className="text-transparent bg-clip-text bg-linear-to-r from-pink-400 via-red-400 to-orange-300">
              {" "}
              Zone
            </span>
            <br className="hidden sm:block" />
            <span
              className={`text-sm font-light tracking-widest ${
                isDark ? "text-gray-400" : "text-gray-600"
              }`}
            >
              VÄXJÖ
            </span>
          </div>
        </div>

        <div className="hidden lg:flex gap-8 items-center">
          <NavLink isDark={isDark} href="#events">
            Events
          </NavLink>
          <NavLink isDark={isDark} href="#varfor">
            Why Us
          </NavLink>
          <NavLink isDark={isDark} href="#testimonials">
            Testimonials
          </NavLink>
          <NavLink isDark={isDark} href="#kontakt">
            Contact
          </NavLink>

          <button
            type="button"
            className={`p-2 rounded-lg transition-all duration-300 flex items-center gap-1 cursor-not-allowed opacity-60 ${
              isDark
                ? "bg-white/10 hover:bg-white/20 text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-900"
            }`}
            title="Language selection (decorative)"
            disabled
          >
            <Globe size={20} />
            <span className="text-sm font-semibold uppercase">SV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-lg transition-all duration-300 ${
              isDark
                ? "bg-white/10 hover:bg-white/20 text-yellow-300"
                : "bg-gray-100 hover:bg-gray-200 text-yellow-600"
            }`}
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            type="button"
            className="px-8 py-3 bg-linear-to-r from-pink-500 to-orange-400 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/50 hover:scale-105 active:scale-95"
          >
            Contact Us
          </button>
        </div>

        <div className="lg:hidden flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-lg transition-all duration-300 ${
              isDark
                ? "bg-white/10 hover:bg-white/20 text-yellow-300"
                : "bg-gray-100 hover:bg-gray-200 text-yellow-600"
            }`}
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            type="button"
            className={`p-2 rounded-lg transition-all duration-300 ${
              isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
            }`}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div
          className={`lg:hidden backdrop-blur-sm px-4 py-6 space-y-2 border-t transition-colors duration-300 ${
            isDark
              ? "bg-slate-800/95 border-purple-500/20"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <MobileNavLink isDark={isDark} href="#events">
            Events
          </MobileNavLink>
          <MobileNavLink isDark={isDark} href="#varfor">
            Why Us
          </MobileNavLink>
          <MobileNavLink isDark={isDark} href="#testimonials">
            Testimonials
          </MobileNavLink>
          <MobileNavLink isDark={isDark} href="#kontakt">
            Contact
          </MobileNavLink>
          <button
            type="button"
            className="w-full px-8 py-3 bg-linear-to-r from-pink-500 to-orange-400 text-white font-semibold rounded-xl mt-4 transition-all duration-300"
          >
            Contact Us
          </button>
        </div>
      )}
    </header>
  );
}

function NavLink({
  isDark,
  href,
  children,
}: {
  isDark: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`relative group text-lg font-medium transition-colors duration-300 ${
        isDark
          ? "text-gray-300 hover:text-white"
          : "text-gray-700 hover:text-gray-900"
      }`}
    >
      {children}
      <span
        className={`absolute bottom-0 left-0 w-0 h-1 rounded-full transition-all duration-300 group-hover:w-full ${
          isDark ? "bg-pink-400" : "bg-pink-500"
        }`}
      ></span>
    </a>
  );
}

function MobileNavLink({
  isDark,
  href,
  children,
}: {
  isDark: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`block px-4 py-3 rounded-lg transition-all duration-300 ${
        isDark
          ? "text-gray-300 hover:bg-white/10 hover:text-white"
          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {children}
    </a>
  );
}
