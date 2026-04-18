"use server";

import { redirect } from "next/navigation";
import { clearCart, readCart, writeCart } from "@/lib/cart";
import prisma from "../prisma";
import { getProductSpotsLeft } from "../product-capacity";

export async function addToCart(params: {
  productId: string;
  qty?: number;
  redirectTo?: string;
}) {
  const { productId, qty = 1, redirectTo } = params;
  if (!productId) throw new Error("productId required");

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      active: true,
      maxCustomer: true,
      unlimitedCustomers: true,
      countCustomer: true,
    },
  });
  if (!product || !product.active) {
    throw new Error("Produkten är inte tillgänglig.");
  }

  const cart = await readCart();
  const existing = cart.items.find((i) => i.productId === productId);
  const nextQty = (existing?.qty ?? 0) + qty;

  if (!product.unlimitedCustomers && getProductSpotsLeft(product) < nextQty) {
    throw new Error("Produkten har inga lediga platser kvar.");
  }

  if (existing) {
    existing.qty += qty;
  } else {
    cart.items.push({ productId, qty });
  }
  cart.updatedAt = new Date().toISOString();
  await writeCart(cart);

  if (redirectTo) redirect(redirectTo);
}

export async function updateCart(params: { productId: string; qty: number }) {
  const { productId, qty } = params;
  if (!productId) throw new Error("productId required");

  const cart = await readCart();
  const item = cart.items.find((i) => i.productId === productId);
  if (item) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        maxCustomer: true,
        unlimitedCustomers: true,
        countCustomer: true,
      },
    });

    let finalQty = qty;

    if (product && !product.unlimitedCustomers) {
      finalQty = Math.min(qty, getProductSpotsLeft(product));
    }

    item.qty = finalQty;
    if (item.qty <= 0) {
      cart.items = cart.items.filter((i) => i.productId !== productId);
    }
    cart.updatedAt = new Date().toISOString();
    await writeCart(cart);
  }
}

export async function removeFromCart(params: { productId: string }) {
  const { productId } = params;
  if (!productId) throw new Error("productId required");

  const cart = await readCart();
  cart.items = cart.items.filter((i) => i.productId !== productId);
  cart.updatedAt = new Date().toISOString();
  await writeCart(cart);
}

export async function clearCartAndRedirect(to?: string) {
  await clearCart();
  if (to) redirect(to);
}

export async function getCart() {
  return await readCart();
}
