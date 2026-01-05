import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdminRole } from "@/lib/actions/admin";

export default async function AdminPanel() {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return notFound(); // This stops all adminpages to be rendered since its on the layout for admin.

  return (
    <nav className="bg-card p-2 border-b-2 border-brand-secondary shadow-sm">
      <div className="md:flex items-center space-x-6 px-4">
        <span className="text-foreground text-sm font-bold">Admin:</span>

        <ul className="md:flex space-x-4 text-sm">
          <li>
            <Link
              href="/admin/start"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Startsida
            </Link>
          </li>
          <li>
            <Link
              href="/admin/omoss"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Om oss
            </Link>
          </li>
          <li>
            <Link
              href="/admin/courses"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Kurser
            </Link>
          </li>
          <li>
            <Link
              href="/admin/products"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Produkter
            </Link>
          </li>
          <li>
            <Link
              href="/admin/orders"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Ordrar
            </Link>
          </li>
          <li>
            <Link
              href="/admin/events"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Event
            </Link>
          </li>
          <li>
            <Link
              href="/admin/gallery"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Galleri
            </Link>
          </li>
          <li>
            <Link
              href="/admin/students"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Elever
            </Link>
          </li>
          <li>
            <Link
              href="/admin/termin"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Terminer / Scheman
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
