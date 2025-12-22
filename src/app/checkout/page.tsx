export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createCheckoutAndRedirect } from "@/lib/actions/checkout";
import { getSessionData } from "@/lib/actions/sessiondata";
import { readCart } from "@/lib/cart";
import prisma from "@/lib/prisma";
import CartSummary from "./CartSummary";

export default async function Page() {
  const session = await getSessionData();
  const cart = await readCart();
  const hasItems = cart.items.length > 0;

  async function action(formData: FormData) {
    "use server";
    const postalcode = formData.get("postalcode")?.toString();
    const note = formData.get("note")?.toString();
    const currentCart = await readCart();
    if (!currentCart.items.length) throw new Error("Varukorgen är tom");
    const ids = currentCart.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, price: true },
    });
    const byId = new Map(
      products.map((p) => [p.id, parseFloat(String(p.price))]),
    );
    const items = currentCart.items.map((it) => ({
      productId: it.productId,
      count: it.qty,
      price: byId.get(it.productId) ?? 0,
    }));
    await createCheckoutAndRedirect({ items, postalcode, note });
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold">Kassa</h1>
        <p className="text-sm text-gray-700">
          Du måste vara inloggad för att slutföra ett köp.
        </p>
        <a
          href={`/signin?callbackUrl=${encodeURIComponent("/checkout")}`}
          className="inline-block bg-black text-white px-4 py-2 rounded"
        >
          Logga in
        </a>
        <p className="text-xs text-gray-500">
          Har du inget konto?{" "}
          <a className="underline" href="/signup">
            Skapa konto
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Kassa</h1>
        <p className="text-gray-500">
          Granska din beställning och slutför köpet.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Din varukorg</h2>
        <CartSummary />
      </section>

      {hasItems && (
        <section className="space-y-4 bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-bold">Leverans & Information</h2>
          <form action={action} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="postalcode"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Postnummer
                </label>
                <input
                  id="postalcode"
                  name="postalcode"
                  type="text"
                  placeholder="123 45"
                  className="block w-full rounded-md border-gray-300 border px-3 py-2 text-sm focus:border-black focus:ring-black outline-none transition"
                />
                <p className="text-xs text-gray-400">
                  Valfritt, men hjälper oss med planering.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="note"
                className="block text-sm font-semibold text-gray-700"
              >
                Notering till beställningen
              </label>
              <textarea
                id="note"
                name="note"
                rows={3}
                placeholder="t.ex. Swish-referens eller speciella önskemål"
                className="block w-full rounded-md border-gray-300 border px-3 py-2 text-sm focus:border-black focus:ring-black outline-none transition resize-none"
              />
            </div>

            <div className="pt-4 border-t">
              <button
                type="submit"
                className="w-full bg-black text-white font-bold py-3 px-4 rounded-md hover:bg-gray-800 transition-colors shadow-lg active:scale-[0.98]"
              >
                Slutför beställning (Faktura)
              </button>
              <p className="mt-4 text-center text-xs text-gray-500">
                Genom att slutföra köpet godkänner du våra köpvillkor.
              </p>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
