import type { Product } from "@/generated/prisma/client";
import { getAllProducts } from "@/lib/actions/admin";
import AddProductForm from "./components/AddProductForm";
import ProductItem from "./components/ProductItem";
import SearchInputProd from "./components/SearchProducts";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";

  const allProducts: Product[] = await getAllProducts();

  return (
    <div>
      <div className="w-full md:grid md:grid-cols-2 gap-2 p-2">
        <div className="col-span-2 flex gap-2">
          <div>
            <span className="font-bold text-2xl">Produkter</span>
          </div>

          <div>
            <SearchInputProd />
          </div>

          <div>
            <AddProductForm />
          </div>
        </div>
        {allProducts
          .filter((p) => p.name.includes(query))
          .map((p) => (
            <ProductItem product={p} key={p.id}></ProductItem>
          ))}
      </div>
    </div>
  );
}
