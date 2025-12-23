//navbar

"use client"; // fix: Can we do this without using client?

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="w-full">
      <nav className="md:flex items-center justify-between p-4 bg-linear-to-r from-purple-900 to-gray-900 text-white">
        <Link href="/">
          <span className="text-xl font-bold">MotionZone Växjö</span>
        </Link>

        {/* Desktop Menu */}
        <ul className="hidden md:flex space-x-6 text-sm">
          <li>
            <Link href="/" className="hover:text-cyan-400">
              Hem
            </Link>
          </li>
          <li>
            <Link href="/courses" className="hover:text-cyan-400">
              Kurser
            </Link>
          </li>
          <li>
            <Link href="/gallery" className="hover:text-cyan-400">
              Galleri
            </Link>
          </li>
          <li>
            <Link href="/about" className="hover:text-cyan-400">
              Om oss
            </Link>
          </li>
        </ul>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-4">
          <span className="text-sm">Svenska 🇸🇪</span>
          <Link href="/checkout" className="hover:text-cyan-400">
            <span className="text-sm">Varukorg 🛒</span>
          </Link>
          <Link href="/user">
            <button
              type="button"
              className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
            >
              Logga in
            </button>
          </Link>
          <Link href="/admin" className="hover:text-cyan-400">
            Admin
          </Link>
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
            Kurser
          </Link>
          <Link
            href="/gallery"
            className="block py-2 hover:text-cyan-400 transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            Galleri
          </Link>
          <Link
            href="/about"
            className="block py-2 hover:text-cyan-400 transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            Om oss
          </Link>
          <div className="border-t border-purple-700 pt-3 mt-3 space-y-3">
            <div className="py-2 text-sm">Svenska 🇸🇪</div>
            <Link
              href="/checkout"
              className="block py-2 hover:text-cyan-400 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Varukorg 🛒
            </Link>
            <Link href="/user" onClick={() => setMenuOpen(false)}>
              <button
                type="button"
                className="w-full bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700"
              >
                Logga in
              </button>
            </Link>
            <Link
              href="/admin"
              className="block py-2 hover:text-cyan-400 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Admin
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
