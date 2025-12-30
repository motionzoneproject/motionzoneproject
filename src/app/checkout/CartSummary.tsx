export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { removeFromCart, updateCart } from "@/lib/actions/cart";
import { readCart } from "@/lib/cart";
import prisma from "@/lib/prisma";

export default async function CartSummary() {
  const cart = await readCart();
  const items = cart.items;

  if (!items.length) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-muted-foreground">Din varukorg är tom.</p>
        <Button asChild className="bg-brand hover:bg-brand-light text-white">
          <Link href="/courses">Se våra kurser</Link>
        </Button>
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
      <div className="divide-y divide-border">
        {rows.map((r) => (
          <div key={r.id} className="py-4 flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium text-foreground">{r.name}</p>
              <p className="text-sm text-muted-foreground">
                {r.unit.toFixed(0)} kr / st
              </p>
            </div>
            <div className="flex items-center gap-3">
              <form
                action={async () => {
                  "use server";
                  await updateCart({ productId: r.id, qty: r.qty - 1 });
                }}
              >
                <button
                  type="submit"
                  className="w-8 h-8 flex items-center justify-center rounded bg-muted hover:bg-muted/80 text-foreground"
                >
                  -
                </button>
              </form>
              <span className="text-foreground font-medium w-6 text-center">
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
                  className="w-8 h-8 flex items-center justify-center rounded bg-muted hover:bg-muted/80 text-foreground"
                >
                  +
                </button>
              </form>
              <div className="w-24 text-right">
                <p className="font-semibold text-foreground">
                  {r.line.toFixed(0)} kr
                </p>
                <form
                  action={async () => {
                    "use server";
                    await removeFromCart({ productId: r.id });
                  }}
                >
                  <button
                    type="submit"
                    className="text-xs text-destructive hover:underline"
                  >
                    Ta bort
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="pt-4 border-t border-border flex justify-between items-center">
        <span className="text-muted-foreground">Totalt</span>
        <span className="text-xl font-bold text-foreground">
          {total.toFixed(0)} kr
        </span>
      </div>
    </div>
  );
}
