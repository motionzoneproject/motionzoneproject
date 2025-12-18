"use server";

import { redirect } from "next/navigation";
import { createOrder } from "@/lib/orders";
import { getSessionData } from "./sessiondata";

export type CheckoutItem = {
  productId: string;
  count: number;
  price: number;
};

export async function createCheckout(params: {
  items: CheckoutItem[];
  postalcode?: string;
  note?: string;
  // placeholder for future: paymentMethod?: "invoice" | "card" | "swish";
}) {
  const session = await getSessionData();
  if (!session) throw new Error("Unauthorized");

  const { items, postalcode, note } = params;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("No items provided");
  }

  const order = await createOrder({
    userId: session.user.id,
    items,
    postalcode,
    note,
  });

  return {
    orderId: order.id,
    status: order.status ?? "PENDING_PAYMENT",
    successRedirect: `/checkout/success?orderId=${order.id}`,
  } as const;
}

// Helper when used directly as a form/action submit that should navigate immediately
export async function createCheckoutAndRedirect(params: {
  items: CheckoutItem[];
  postalcode?: string;
  note?: string;
}) {
  const result = await createCheckout(params);
  redirect(result.successRedirect);
}
