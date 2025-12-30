//navbar

"use client"; // fix: Can we do this without using client?

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import NavBarAuth from "./Navbar-auth";

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="w-full">
      <nav className="flex w-full items-center justify-between p-4 bg-linear-to-r from-purple-900 to-gray-900 text-white">
        <Link href="/">
          <span className="text-xl font-bold">MotionZone Växjö</span>
        </Link>

        {/* Desktop Menu */}
        <ul className="hidden md:flex space-x-6">
          <li>
            <Link href="/" className="hover:text-cyan-400">
              Hem
            </Link>
          </li>
          <li>
            <Link href="/courses" className="hover:text-cyan-400">
              Våra kurser
            </Link>
          </li>
          {/* <li>
            <Link href="/gallery" className="hover:text-cyan-400">
              Galleri
            </Link>
          </li> */}
          <li>
            <Link href="/about" className="hover:text-cyan-400">
              Om oss
            </Link>
          </li>
        </ul>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-4">
          <span className="">Svenska 🇸🇪</span>
          <Link href="/checkout" className="hover:text-cyan-400">
            <span className="">Varukorg 🛒</span>
          </Link>
          <NavBarAuth></NavBarAuth>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-purple-900 text-white px-4 py-4 space-y-3">
          <Link
            href="/"
            className="block py-2 hover:text-cyan-400 transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            Hem
          </Link>
          <Link
            href="/courses"
            className="block py-2 hover:text-cyan-400 transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            Våra kurser
          </Link>
          {/* <Link
            href="/gallery"
            className="block py-2 hover:text-cyan-400 transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            Galleri
          </Link> */}
          <Link
            href="/about"
            className="block py-2 hover:text-cyan-400 transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            Om oss
          </Link>
          <div className="border-t border-purple-700 pt-3 mt-3 space-y-3 text-center">
            <div className="space-x-4 p-2 flex justify-between">
              <span className="text-lg">Svenska 🇸🇪</span>
              <Link href="/checkout" className="hover:text-cyan-400 text-lg">
                <span className="text-lg">Varukorg 🛒</span>
              </Link>
            </div>
            <NavBarAuth></NavBarAuth>
          </div>
        </div>
      )}
    </header>
  );
}
