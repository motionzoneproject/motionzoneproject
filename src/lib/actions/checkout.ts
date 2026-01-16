"use server";

import { redirect } from "next/navigation";
import { clearCart } from "@/lib/cart";
import { generateOrderConfirmationHtml, sendMail } from "@/lib/mail";
import { createOrder, getOrderById } from "@/lib/orders";
import { getSessionData } from "./sessiondata";

export type CheckoutItem = {
  productId: string;
  count: number;
  price: number;
  participantId?: string | null;
};

export async function createCheckout(params: {
  items: CheckoutItem[];
  postalcode?: string;
  note?: string;
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

  // Try to send confirmation email
  try {
    const fullOrder = await getOrderById(order.id);
    if (fullOrder?.user.email) {
      const html = await generateOrderConfirmationHtml(fullOrder);
      await sendMail(
        fullOrder.user.email,
        `Orderbekräftelse - Order #${order.id}`,
        html
      );
    }
  } catch (emailError) {
    // We don't want to fail the checkout if the email fails, but we should log it
    console.error("Failed to send confirmation email:", emailError);
  }

  // Clear cart after order
  await clearCart();

  return {
    orderId: order.id,
    status: order.status ?? "PENDING_PAYMENT",
    successRedirect: `/checkout/success?orderId=${order.id}`,
  } as const;
}

export async function createCheckoutAndRedirect(params: {
  items: CheckoutItem[];
  postalcode?: string;
  note?: string;
}) {
  const result = await createCheckout(params);
  redirect(result.successRedirect);
}
