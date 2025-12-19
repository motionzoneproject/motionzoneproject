import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { isAdminRole } from "@/lib/actions/admin";
import OrderDetailsClient from "./view-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  noStore();
  const isAdmin = await isAdminRole();
  if (!isAdmin) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Orderdetaljer</h1>
          <Link href="/admin/orders" className="underline">
            Tillbaka
          </Link>
        </div>
        <p className="text-sm text-gray-700">
          Du har inte behörighet att visa denna sida.
        </p>
      </div>
    );
  }

  return <OrderDetailsClient />;
}
