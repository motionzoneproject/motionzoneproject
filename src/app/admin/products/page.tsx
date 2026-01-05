import { redirect } from "next/navigation";
import type { Product } from "@/generated/prisma/client";
import { getAllProducts, isAdminRole } from "@/lib/actions/admin";
import AddProductForm from "./components/AddProductForm";
import ProductItem from "./components/ProductItem";
import SearchInputProd from "./components/SearchProducts";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) {
    redirect("/");
  }

  const params = await searchParams;
  const query = params.q || "";

  const allProducts: Product[] = await getAllProducts();

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produkter</h1>
          <p className="text-muted-foreground">
            Hantera dina produkter och paket.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchInputProd />
          <AddProductForm />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allProducts
          .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
          .map((p) => (
            <ProductItem product={p} key={p.id} />
          ))}
      </div>

      {allProducts.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()),
      ).length === 0 && (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground">Inga produkter hittades.</p>
        </div>
      )}
    </div>
  );
}
