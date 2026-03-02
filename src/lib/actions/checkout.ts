"use server";

import { redirect } from "next/navigation";
import { clearCart } from "@/lib/cart";
import { generateOrderConfirmationHtml, sendMail } from "@/lib/mail";
import { createOrder, getOrderById } from "@/lib/orders";
import prisma from "../prisma";
import { getProductStats } from "./purchase-actions";
import { getSessionData } from "./sessiondata";

export type CheckoutItem = {
  productId: string;
  count: number;
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

  const pCountTotal = new Map();
  const serverItems: {
    productId: string;
    count: number;
    participantId?: string | null;
    price: number;
  }[] = [];

  // Gör en transaction här då.
  const order = await prisma.$transaction(
    async (tx) => {
      for (const itm of items) {
        const p = await tx.product.findUnique({
          where: { id: itm.productId },
        });
        if (!p)
          throw new Error(
            `Product ${itm.productId} was not found. Order cancelled.`,
          );

        const stats = await getProductStats(p.id, tx);

        if (!stats.success)
          throw new Error(
            `Could not get stats for product ${itm.productId}. Order cancelled.`,
          );

        if (
          typeof stats.spotsLeft === "number" &&
          Number.isFinite(stats.spotsLeft) &&
          itm.count > stats.spotsLeft
        )
          throw new Error(
            `Product count exceeds limit for product ${itm.productId}. Count was ${itm.count} and spotsLeft is ${stats.spotsLeft}.`,
          );

        // Vi behöver kolla totalt också.
        pCountTotal.set(
          itm.productId,
          (pCountTotal.get(itm.productId) ?? 0) + itm.count,
        );

        const totalInCartForProduct = pCountTotal.get(itm.productId) ?? 0;
        if (
          typeof stats.spotsLeft === "number" &&
          Number.isFinite(stats.spotsLeft) &&
          totalInCartForProduct > stats.spotsLeft
        )
          throw new Error(
            `product count exceeds limit for product ${itm.productId}. Count was ${totalInCartForProduct} and spotsLeft is ${stats.spotsLeft}.`,
          );

        // Use the server-fetched price directly — never trust the client.
        serverItems.push({
          productId: itm.productId,
          count: itm.count,
          participantId: itm.participantId,
          price: p.price,
        });
      }

      const order = await createOrder(tx, {
        userId: session.user.id,
        items: serverItems,
        postalcode,
        note,
      });

      return order;
    },
    { isolationLevel: "Serializable" },
  );

  // Try to send confirmation email
  try {
    const fullOrder = await getOrderById(order.id);
    if (fullOrder?.user.email) {
      const html = await generateOrderConfirmationHtml(fullOrder);
      await sendMail(
        fullOrder.user.email,
        `Orderbekräftelse - Order #${order.id}`,
        html,
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
