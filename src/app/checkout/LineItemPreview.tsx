"use client";

import { useEffect, useMemo, useState } from "react";

type Product = { id: string; name: string; price: number };

type Props = {
  products: Product[];
  productInputId: string;
  countInputId: string;
  currency?: string;
};

export default function LineItemPreview({
  products,
  productInputId,
  countInputId,
  currency = "SEK",
}: Props) {
  const byId = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );
  const [product, setProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState<number>(1);

  useEffect(() => {
    const prodEl = document.getElementById(
      productInputId,
    ) as HTMLSelectElement | null;
    const qtyEl = document.getElementById(
      countInputId,
    ) as HTMLInputElement | null;
    if (!prodEl || !qtyEl) return;

    const compute = () => {
      const pid = prodEl.value;
      setProduct(byId.get(pid) ?? null);
      const q = Math.max(1, parseInt(qtyEl.value || "1", 10));
      setQty(Number.isFinite(q) ? q : 1);
    };

    compute();
    prodEl.addEventListener("change", compute);
    qtyEl.addEventListener("input", compute);
    return () => {
      prodEl.removeEventListener("change", compute);
      qtyEl.removeEventListener("input", compute);
    };
  }, [byId, productInputId, countInputId]);

  const unit = product?.price ?? 0;
  const total = unit * qty;

  return (
    <div className="space-y-2">
      <div className="border rounded p-3">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Produkt</span>
          <span>Pris/st</span>
          <span>Antal</span>
          <span>Totalt</span>
        </div>
        <div className="flex justify-between mt-1 text-sm">
          <span>{product ? product.name : "—"}</span>
          <span>
            {product ? unit.toFixed(2) : "0.00"} {currency}
          </span>
          <span>{qty}</span>
          <span className="font-semibold">
            {total.toFixed(2)} {currency}
          </span>
        </div>
      </div>
      <button
        type="submit"
        disabled={!product}
        className={`px-4 py-2 rounded text-white ${
          product
            ? "bg-black hover:bg-gray-800"
            : "bg-gray-400 cursor-not-allowed"
        }`}
      >
        Slutför fakturaköp
      </button>
    </div>
  );
}
