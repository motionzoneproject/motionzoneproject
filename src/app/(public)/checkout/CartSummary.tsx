export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { removeFromCart, updateCart } from "@/lib/actions/cart";
import { getProductStats } from "@/lib/actions/purchase-actions";
import { readCart } from "@/lib/cart";
import { pick } from "@/lib/i18n/pick";
import { formatPrice } from "@/lib/money";
import prisma from "@/lib/prisma";
import { getDictionary } from "@/locales/get-dictionary";

export default async function CartSummary() {
  const { lang, t } = await getDictionary();
  const cart = await readCart();
  const items = cart.items;

  if (!items.length) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-muted-foreground">{t.checkout.summary.empty}</p>
        <Button asChild className="bg-brand hover:bg-brand-light text-white">
          <Link href="/courses">{t.checkout.summary.seeCourses}</Link>
        </Button>
      </div>
    );
  }

  const ids = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, active: true },
    select: {
      id: true,
      name: true,
      name_en: true,
      price: true,
      maxCustomer: true,
      unlimitedCustomers: true,
    },
  });

  const getProductById = new Map(products.map((p) => [p.id, p]));

  let total = 0;
  const rows = await Promise.all(
    items.map(async (it) => {
      const p = getProductById.get(it.productId);
      if (!p) {
        return {
          id: it.productId,
          name: t.checkout.summary.unknownProduct,
          unit: 0,
          qty: 0,
          available: 0,
          success: false,
          line: 0,
        };
      }

      const unit = p.price;
      const line = unit * it.qty;
      const stats = await getProductStats(p.id);
      const available = stats.success ? (stats.spotsLeft ?? 0) : 0;
      total += line;

      return {
        id: it.productId,
        name: pick(p, "name", lang) as string,
        unit,
        qty: stats.success ? it.qty : 0,
        maxCustomer: p.maxCustomer,
        success: stats.success,
        available,
        line,
      };
    }),
  );

  return (
    <div className="space-y-4">
      <div className="divide-y divide-border">
        {rows.map((r) => (
          <div key={r.id} className="py-4 flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium text-foreground">{r.name}</p>
              <p className="text-sm text-muted-foreground">
                {t.checkout.summary.perUnit.replace(
                  "{{price}}",
                  formatPrice(r.unit, lang),
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {!r.success
                  ? t.checkout.summary.statusUnknown
                  : Number.isFinite(r.available)
                    ? t.checkout.summary.maxLabel.replace(
                        "{{count}}",
                        String(r.available),
                      )
                    : t.checkout.summary.unlimited}
              </p>
              {r.success &&
                Number.isFinite(r.available) &&
                r.qty >= r.available && (
                  <p className="text-xs text-amber-600 mt-1">
                    {t.checkout.summary.maxReached}
                  </p>
                )}
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
                  disabled={
                    !r.success ||
                    (Number.isFinite(r.available) && r.qty >= r.available)
                  }
                  className="w-8 h-8 flex items-center justify-center rounded bg-muted hover:bg-muted/80 text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </form>
              <div className="w-24 text-right">
                <p className="font-semibold text-foreground">
                  {formatPrice(r.line, lang)}
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
                    {t.checkout.summary.remove}
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="pt-4 border-t border-border flex justify-between items-center">
        <span className="text-muted-foreground">
          {t.checkout.summary.total}
        </span>
        <span className="text-xl font-bold text-foreground">
          {formatPrice(total, lang)}
        </span>
      </div>
    </div>
  );
}
