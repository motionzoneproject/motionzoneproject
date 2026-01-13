"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/start", label: "Startsida" },
  { href: "/admin/omoss", label: "Om oss" },
  { href: "/admin/courses", label: "Kurser" },
  { href: "/admin/products", label: "Produkter" },
  { href: "/admin/orders", label: "Ordrar" },
  { href: "/admin/events", label: "Event" },
  { href: "/admin/gallery", label: "Galleri" },
  { href: "/admin/students", label: "Elever" },
  { href: "/admin/termin", label: "Terminer / Scheman" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="md:flex items-center space-x-6 px-4">
      <span className="text-foreground text-sm font-bold">Admin:</span>

      <ul className="md:flex space-x-4 text-sm">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`transition-colors ${
                  isActive
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
