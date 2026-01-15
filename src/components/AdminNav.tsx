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
    <div className="flex flex-col gap-3 px-2 md:flex-row md:items-center md:gap-6 md:px-4">
      <span className="text-foreground text-sm font-bold">Admin:</span>

      <ul className="flex flex-wrap gap-2 text-sm">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`inline-flex items-center rounded-md border px-3 py-2 transition-colors ${
                  isActive
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-muted/30 text-foreground hover:bg-muted"
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
