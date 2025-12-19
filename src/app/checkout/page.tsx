import { createCheckoutAndRedirect } from "@/lib/actions/checkout";
import { getSessionData } from "@/lib/actions/sessiondata";
import prisma from "@/lib/prisma";
import LineItemPreview from "./LineItemPreview";
import TotalPreview from "./TotalPreview";

export default async function Page() {
  const session = await getSessionData();
  const products = await prisma.product.findMany({
    select: { id: true, name: true, price: true },
    orderBy: { name: "asc" },
  });
  const productsForClient = products.map((p) => ({
    id: p.id,
    name: p.name,
    price: parseFloat(String(p.price)),
  }));

  async function action(formData: FormData) {
    "use server";
    const productId = String(formData.get("productId") || "");
    const count = Number(formData.get("count") || 1);
    const postalcode = formData.get("postalcode")?.toString();
    const note = formData.get("note")?.toString();
    // Look up price server-side to avoid trusting client input
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new Error("Produkt hittades inte");
    const price = parseFloat(String(product.price));

    await createCheckoutAndRedirect({
      items: [{ productId, count, price }],
      postalcode,
      note,
    });
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
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Kassa</h1>
      <p className="text-sm text-gray-600">
        Välj produkt och antal för fakturaköp.
      </p>
      <form action={action} className="space-y-3">
        <div>
          <label htmlFor="productId" className="block text-sm font-medium">
            Produkt
          </label>
          <select
            id="productId"
            name="productId"
            className="border w-full px-2 py-1"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Välj en produkt
            </option>
            {productsForClient.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.price.toFixed(2)} SEK
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end justify-between gap-4">
          <label htmlFor="count" className="block text-sm font-medium">
            Antal
          </label>
          <input
            id="count"
            name="count"
            type="number"
            min={1}
            defaultValue={1}
            className="border w-full px-2 py-1"
          />
          <TotalPreview
            products={productsForClient.map(({ id, price }) => ({ id, price }))}
            productInputId="productId"
            countInputId="count"
          />
        </div>
        <div>
          <label htmlFor="postalcode" className="block text-sm font-medium">
            Postnummer (valfritt)
          </label>
          <input
            id="postalcode"
            name="postalcode"
            placeholder="123 45"
            className="border w-full px-2 py-1"
          />
        </div>
        <div>
          <label htmlFor="note" className="block text-sm font-medium">
            Notering (valfritt)
          </label>
          <input
            id="note"
            name="note"
            placeholder="t.ex. Swish referens"
            className="border w-full px-2 py-1"
          />
        </div>
        <LineItemPreview
          products={productsForClient}
          productInputId="productId"
          countInputId="count"
        />
      </form>
    </div>
  );
}
