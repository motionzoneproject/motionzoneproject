import { cookies, headers } from "next/headers";

export type CartItem = { productId: string; qty: number };
export type Cart = { items: CartItem[]; updatedAt: string; v: 1 };

const COOKIE_NAME = "mz_cart";

function nowIso() {
  return new Date().toISOString();
}

export async function readCart(): Promise<Cart> {
  try {
    const cookieStore = await cookies();
    let raw = cookieStore.get(COOKIE_NAME)?.value;
    if (!raw) {
      const headerList = await headers();
      const cookieHeader = headerList.get("cookie") || "";
      const parts = cookieHeader.split(";");
      for (let p of parts) {
        p = p.trim();
        if (p.startsWith(`${COOKIE_NAME}=`)) {
          raw = p.substring(COOKIE_NAME.length + 1);
          break;
        }
      }
    }
    if (!raw) return { items: [], updatedAt: nowIso(), v: 1 };
    let value = raw;
    try {
      value = decodeURIComponent(raw);
    } catch {}
    const parsed = JSON.parse(value);
    if (!parsed || !Array.isArray(parsed.items)) {
      return { items: [], updatedAt: nowIso(), v: 1 };
    }
    const items: CartItem[] = parsed.items
      .map((it: { productId: string; qty: number }) => ({
        productId: String(it.productId),
        qty: Number(it.qty) || 0,
      }))
      .filter((it: CartItem) => it.productId && it.qty > 0);
    return { items, updatedAt: parsed.updatedAt || nowIso(), v: 1 };
  } catch {
    return { items: [], updatedAt: nowIso(), v: 1 };
  }
}

export async function writeCart(cart: Cart) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify(cart), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14, // 14 days
  });
}

export async function clearCart() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
}

export function mergeCarts(primary: Cart, secondary: Cart): Cart {
  const map = new Map<string, number>();
  for (const it of [...primary.items, ...secondary.items]) {
    map.set(it.productId, (map.get(it.productId) || 0) + it.qty);
  }
  const merged: Cart = {
    items: Array.from(map.entries()).map(([productId, qty]) => ({
      productId,
      qty,
    })),
    updatedAt: nowIso(),
    v: 1,
  };
  return merged;
}
