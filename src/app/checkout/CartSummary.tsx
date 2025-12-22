export const dynamic = "force-dynamic";
export const revalidate = 0;

import { removeFromCart, updateCart } from "@/lib/actions/cart";
import { readCart } from "@/lib/cart";
import prisma from "@/lib/prisma";

export default async function CartSummary() {
  const cart = await readCart();
  const items = cart.items;

  if (!items.length) {
    return (
      <div className="border rounded-lg p-8 text-center space-y-4 bg-gray-50">
        <p className="text-gray-500">Din varukorg är tom.</p>
        <a
          href="/courses"
          className="inline-block bg-black text-white px-6 py-2 rounded-md text-sm font-semibold hover:bg-gray-800 transition"
        >
          Se våra kurser
        </a>
      </div>
    );
  }

  const ids = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, price: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  let total = 0;
  const rows = items.map((it) => {
    const p = byId.get(it.productId);
    const unit = p ? parseFloat(String(p.price)) : 0;
    const line = unit * it.qty;
    total += line;
    return {
      id: it.productId,
      name: p?.name ?? "Okänd produkt",
      unit,
      qty: it.qty,
      line,
    };
  });

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="bg-gray-50 px-4 py-2 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider grid grid-cols-12 gap-2">
          <div className="col-span-6">Produkt</div>
          <div className="col-span-3 text-center">Antal</div>
          <div className="col-span-3 text-right">Summa</div>
        </div>
        <div className="divide-y">
          {rows.map((r) => (
            <div
              key={r.id}
              className="px-4 py-3 grid grid-cols-12 gap-2 items-center"
            >
              <div className="col-span-6">
                <div className="font-medium text-sm">{r.name}</div>
                <div className="text-xs text-gray-500">
                  {r.unit.toFixed(2)} SEK / st
                </div>
              </div>
              <div className="col-span-3 flex items-center justify-center gap-2">
                <form
                  action={async () => {
                    "use server";
                    await updateCart({ productId: r.id, qty: r.qty - 1 });
                  }}
                >
                  <button
                    type="submit"
                    className="w-6 h-6 flex items-center justify-center rounded border hover:bg-gray-100 text-gray-600"
                  >
                    -
                  </button>
                </form>
                <span className="text-sm font-medium w-4 text-center">
                  {r.qty}
                </span>
                <form
                  action={async () => {
                    "use server";
                    await updateCart({ productId: r.id, qty: r.qty + 1 });
                  }}
                >
                  <button
                    type="submit"
                    className="w-6 h-6 flex items-center justify-center rounded border hover:bg-gray-100 text-gray-600"
                  >
                    +
                  </button>
                </form>
              </div>
              <div className="col-span-3 text-right">
                <div className="text-sm font-semibold">
                  {r.line.toFixed(2)} SEK
                </div>
                <form
                  action={async () => {
                    "use server";
                    await removeFromCart({ productId: r.id });
                  }}
                >
                  <button
                    type="submit"
                    className="text-[10px] text-red-500 hover:underline"
                  >
                    Ta bort
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-gray-50 px-4 py-3 border-t flex justify-between items-center">
          <span className="text-sm font-bold text-gray-700">
            Totalt att betala
          </span>
          <span className="text-lg font-black text-black">
            {total.toFixed(2)} SEK
          </span>
        </div>
      </div>
    </div>
  );
}
