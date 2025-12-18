"use client";

import { useEffect, useMemo, useState } from "react";

type ProductPrice = { id: string; price: number };

export default function TotalPreview(props: {
  products: ProductPrice[];
  productInputId: string;
  countInputId: string;
  currency?: string;
}) {
  const { products, productInputId, countInputId, currency = "SEK" } = props;
  const priceMap = useMemo(
    () => new Map(products.map((p) => [p.id, p.price])),
    [products],
  );
  const [total, setTotal] = useState<number>(0);

  useEffect(() => {
    const productEl = document.getElementById(
      productInputId,
    ) as HTMLSelectElement | null;
    const countEl = document.getElementById(
      countInputId,
    ) as HTMLInputElement | null;

    if (!productEl || !countEl) return;

    const compute = () => {
      const productId = productEl.value;
      const count = Math.max(1, parseInt(countEl.value || "1", 10));
      const price = priceMap.get(productId) ?? 0;
      setTotal(Number((price * count).toFixed(2)));
    };

    compute();
    productEl.addEventListener("change", compute);
    countEl.addEventListener("input", compute);

    return () => {
      productEl.removeEventListener("change", compute);
      countEl.removeEventListener("input", compute);
    };
  }, [priceMap, productInputId, countInputId]);

  return (
    <div className="text-sm">
      <span className="text-gray-600">Totalt:</span>
      <span className="ml-2 font-semibold">
        {Number.isFinite(total)
          ? `${total.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} ${currency}`
          : `0.00 ${currency}`}
      </span>
    </div>
  );
}
