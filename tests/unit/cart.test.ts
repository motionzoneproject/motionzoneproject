import { beforeEach, describe, expect, it, vi } from "vitest";

// cart.ts läser kakan via next/headers, som bara finns i en request.
const cookieJar = vi.hoisted(() => ({
  value: undefined as string | undefined,
  header: "",
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () =>
      cookieJar.value === undefined ? undefined : { value: cookieJar.value },
    set: vi.fn(),
  }),
  headers: async () => new Headers({ cookie: cookieJar.header }),
}));

import { type Cart, mergeCarts, readCart } from "@/lib/cart";

const cart = (items: Cart["items"]): Cart => ({
  items,
  updatedAt: "2026-01-01",
  v: 1,
});

describe("mergeCarts", () => {
  it("summerar antal för samma produkt", () => {
    const merged = mergeCarts(
      cart([
        { productId: "a", qty: 1 },
        { productId: "b", qty: 2 },
      ]),
      cart([
        { productId: "a", qty: 3 },
        { productId: "c", qty: 1 },
      ]),
    );
    expect(merged.items).toEqual([
      { productId: "a", qty: 4 },
      { productId: "b", qty: 2 },
      { productId: "c", qty: 1 },
    ]);
    expect(merged.v).toBe(1);
    expect(merged.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("fungerar med tomma korgar", () => {
    expect(mergeCarts(cart([]), cart([])).items).toEqual([]);
    expect(
      mergeCarts(cart([]), cart([{ productId: "a", qty: 2 }])).items,
    ).toEqual([{ productId: "a", qty: 2 }]);
  });

  it("ändrar inte indata", () => {
    const a = cart([{ productId: "a", qty: 1 }]);
    mergeCarts(a, cart([{ productId: "a", qty: 1 }]));
    expect(a.items).toEqual([{ productId: "a", qty: 1 }]);
  });
});

describe("readCart", () => {
  beforeEach(() => {
    cookieJar.value = undefined;
    cookieJar.header = "";
  });

  it("ger en tom korg utan kaka", async () => {
    expect((await readCart()).items).toEqual([]);
  });

  it("läser en giltig kaka och rensar ogiltiga rader", async () => {
    cookieJar.value = JSON.stringify({
      items: [
        { productId: "a", qty: 2 },
        { productId: "b", qty: 0 },
        { productId: "c", qty: -1 },
        { productId: "", qty: 1 },
        { productId: "d", qty: "3" },
        { productId: "e", qty: "x" },
      ],
      updatedAt: "2026-05-05",
    });
    const result = await readCart();
    expect(result.items).toEqual([
      { productId: "a", qty: 2 },
      { productId: "d", qty: 3 },
    ]);
    expect(result.updatedAt).toBe("2026-05-05");
  });

  it("läser en URL-kodad kaka", async () => {
    cookieJar.value = encodeURIComponent(
      JSON.stringify({ items: [{ productId: "a", qty: 1 }] }),
    );
    expect((await readCart()).items).toEqual([{ productId: "a", qty: 1 }]);
  });

  it("faller tillbaka på Cookie-headern", async () => {
    cookieJar.header = `annan=1; mz_cart=${encodeURIComponent(
      JSON.stringify({ items: [{ productId: "h", qty: 1 }] }),
    )}`;
    expect((await readCart()).items).toEqual([{ productId: "h", qty: 1 }]);
  });

  it("ger en tom korg för trasig eller felformad kaka", async () => {
    for (const raw of ["{inte json", "null", '{"items":"a"}', "[]"]) {
      cookieJar.value = raw;
      expect((await readCart()).items).toEqual([]);
    }
  });
});
