import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Kundvagnen ligger i en cookie. Ersätt setupens tomma cookie-mock med en
// som faktiskt minns det som skrivs.
const jar = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({
    get: (name: string) =>
      jar.has(name) ? { name, value: jar.get(name) as string } : undefined,
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    set: (name: string, value: string, opts?: { maxAge?: number }) => {
      if (opts?.maxAge === 0 || value === "") jar.delete(name);
      else jar.set(name, value);
    },
    delete: (name: string) => jar.delete(name),
    has: (name: string) => jar.has(name),
  }),
}));

import {
  addToCart,
  clearCartAndRedirect,
  getCart,
  removeFromCart,
  updateCart,
} from "@/lib/actions/cart";
import { createCheckout } from "@/lib/actions/checkout";
import prisma from "@/lib/prisma";
import { createCourse, createProduct, createUser } from "../helpers/factories";
import { as, invoiceOther } from "../helpers/orders";

let teacher: Awaited<ReturnType<typeof createUser>>;

beforeAll(async () => {
  teacher = await createUser({ role: "teacher" });
});

beforeEach(() => jar.clear());

async function product(opts: { active?: boolean; maxCustomer?: number } = {}) {
  const course = await createCourse({ teacher, future: 1 });
  const p = await createProduct({ type: "COURSE", courses: [course] });
  return prisma.product.update({
    where: { id: p.id },
    data: {
      active: opts.active ?? true,
      ...(opts.maxCustomer != null
        ? { maxCustomer: opts.maxCustomer, unlimitedCustomers: false }
        : {}),
    },
  });
}

describe("kundvagnen", () => {
  it("lägger till, slår ihop, ändrar och tar bort", async () => {
    const a = await product();
    const b = await product();

    expect(await addToCart({ productId: a.id })).toEqual({ success: true });
    await addToCart({ productId: a.id, qty: 2 });
    await addToCart({ productId: b.id });
    expect((await getCart()).items).toEqual([
      { productId: a.id, qty: 3 },
      { productId: b.id, qty: 1 },
    ]);

    await updateCart({ productId: a.id, qty: 0 });
    expect((await getCart()).items).toEqual([{ productId: b.id, qty: 1 }]);

    await removeFromCart({ productId: b.id });
    expect((await getCart()).items).toEqual([]);
  });

  it("en inaktiv produkt kan inte läggas i kundvagnen", async () => {
    const p = await product({ active: false });
    expect(await addToCart({ productId: p.id })).toEqual({ success: false });
    expect((await getCart()).items).toEqual([]);
    expect(await addToCart({ productId: "finns-inte" })).toEqual({
      success: false,
    });
  });

  it("antalet begränsas till platserna som finns kvar", async () => {
    const p = await product({ maxCustomer: 2 });
    await addToCart({ productId: p.id });
    await updateCart({ productId: p.id, qty: 10 });
    expect((await getCart()).items).toEqual([{ productId: p.id, qty: 2 }]);
  });

  it("en trasig cookie ger en tom kundvagn", async () => {
    jar.set("mz_cart", "{inte json");
    expect((await getCart()).items).toEqual([]);
  });

  it("kundvagnen töms efter en lyckad beställning", async () => {
    const p = await product();
    await addToCart({ productId: p.id });
    const buyer = await createUser();
    await as(buyer, () =>
      createCheckout({
        items: [{ productId: p.id, count: 1 }],
        invoice: invoiceOther(),
      }),
    );
    expect((await getCart()).items).toEqual([]);
  });

  it("clearCartAndRedirect tömmer och skickar vidare", async () => {
    const p = await product();
    await addToCart({ productId: p.id });
    await expect(clearCartAndRedirect("/kurser")).rejects.toThrow(
      "NEXT_REDIRECT:/kurser",
    );
    expect((await getCart()).items).toEqual([]);
  });
});
