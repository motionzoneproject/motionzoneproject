import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdminRole } from "@/lib/actions/admin";

export default async function AdminPanel() {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return notFound(); // This stops all adminpages to be rendered since its on the layout for admin.

  return (
    <nav className="bg-white p-2 border-b-2 border-cyan-400">
      <div className="md:flex items-center space-x-6">
        <span className="text-gray-900 text-sm font-bold">Admin:</span>

        <ul className="md:flex space-x-4 text-sm">
          <li>
            <Link
              href="/admin/start"
              className="text-gray-800 hover:text-gray-900"
            >
              Startsida
            </Link>
          </li>
          <li>
            <Link
              href="/admin/omoss"
              className="text-gray-800 hover:text-gray-900"
            >
              Om oss
            </Link>
          </li>
          <li>
            <Link
              href="/admin/courses"
              className="text-gray-800 hover:text-gray-900"
            >
              Kurser
            </Link>
          </li>
          <li>
            <Link
              href="/admin/products"
              className="text-gray-800 hover:text-gray-900"
            >
              Produkter
            </Link>
          </li>
          <li>
            <Link
              href="/admin/orders"
              className="text-gray-800 hover:text-gray-900"
            >
              Ordrar
            </Link>
          </li>
          <li>
            <Link
              href="/admin/events"
              className="text-gray-800 hover:text-gray-900"
            >
              Event
            </Link>
          </li>
          <li>
            <Link
              href="/admin/gallery"
              className="text-gray-800 hover:text-gray-900"
            >
              Galleri
            </Link>
          </li>
          <li>
            <Link
              href="/admin/students"
              className="text-gray-800 hover:text-gray-900"
            >
              Elever
            </Link>
          </li>
          <li>
            <Link
              href="/admin/termin"
              className="text-gray-800 hover:text-gray-900"
            >
              Terminer / Scheman
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
