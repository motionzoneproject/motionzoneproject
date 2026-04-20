"use server";

import { redirect } from "next/navigation";
import { clearCart } from "@/lib/cart";
import { generateOrderConfirmationHtml, sendMail } from "@/lib/mail";
import { createOrder, getOrderById } from "@/lib/orders";
import prisma from "../prisma";
import { getProductSpotsLeft } from "../product-capacity";
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

  const pCountTotal = new Map<string, number>();
  const serverItems: {
    productId: string;
    count: number;
    participantId?: string | null;
    price: number;
  }[] = [];

  const order = await prisma.$transaction(
    async (tx) => {
      for (const itm of items) {
        const product = await tx.product.findUnique({
          where: { id: itm.productId },
          select: {
            id: true,
            price: true,
            maxCustomer: true,
            unlimitedCustomers: true,
            countCustomer: true,
          },
        });

        if (!product) {
          throw new Error(
            `Product ${itm.productId} was not found. Order cancelled.`,
          );
        }

        const spotsLeft = getProductSpotsLeft(product);

        if (Number.isFinite(spotsLeft) && itm.count > spotsLeft) {
          throw new Error(
            `Product count exceeds limit for product ${itm.productId}. Count was ${itm.count} and spotsLeft is ${spotsLeft}.`,
          );
        }

        pCountTotal.set(
          itm.productId,
          (pCountTotal.get(itm.productId) ?? 0) + itm.count,
        );

        const totalInCartForProduct = pCountTotal.get(itm.productId) ?? 0;
        if (Number.isFinite(spotsLeft) && totalInCartForProduct > spotsLeft) {
          throw new Error(
            `Product count exceeds limit for product ${itm.productId}. Count was ${totalInCartForProduct} and spotsLeft is ${spotsLeft}.`,
          );
        }

        serverItems.push({
          productId: itm.productId,
          count: itm.count,
          participantId: itm.participantId,
          price: product.price,
        });
      }

      return createOrder(tx, {
        userId: session.user.id,
        items: serverItems,
        postalcode,
        note,
      });
    },
    { isolationLevel: "Serializable" },
  );

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
    console.error("Failed to send confirmation email:", emailError);
  }

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
