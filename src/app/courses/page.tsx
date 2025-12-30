import { addToCart } from "@/lib/actions/cart";
import prisma from "@/lib/prisma";

export default async function Page() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, price: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Våra kurser</h1>
      <ul className="divide-y">
        {products.map((p) => (
          <li key={p.id} className="py-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-gray-600">
                {parseFloat(String(p.price)).toFixed(2)} SEK
              </div>
            </div>
            <form
              action={async () => {
                "use server";
                await addToCart({ productId: p.id, redirectTo: "/checkout" });
              }}
            >
              <button
                type="submit"
                className="bg-black text-white px-3 py-1.5 rounded hover:bg-gray-800"
              >
                Köp nu
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
