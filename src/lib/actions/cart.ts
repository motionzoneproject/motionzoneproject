"use server";

import { redirect } from "next/navigation";
import { clearCart, readCart, writeCart } from "@/lib/cart";

export async function addToCart(params: {
  productId: string;
  qty?: number;
  redirectTo?: string;
}) {
  const { productId, qty = 1, redirectTo } = params;
  if (!productId) throw new Error("productId required");

  const cart = await readCart();
  const existing = cart.items.find((i) => i.productId === productId);
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
    item.qty = qty;
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
