"use server";
// Så i denna samlar vi actions som rör köpta produkter.

import type { Prisma } from "@/generated/prisma/client";
import prisma from "../prisma";
import { getProductSpotsLeft } from "../product-capacity";

// Behöver den här typen för att fortsätta en tx:
export type PrismaTx = Prisma.TransactionClient;

// Okej, så nu den magiska funktionen handleClips då :)
export async function handleClips(
  tx: PrismaTx,
  purchaseItemId: string,
  adjustment: number,
): Promise<{ success: boolean; msg?: string }> {
  if (adjustment === 0) {
    return { success: true, msg: "No adjustment needed." };
  }

  const purchaseItem = await tx.purchaseItem.findUnique({
    where: { id: purchaseItemId },
    select: {
      id: true,
      remainingCount: true,
      unlimited: true,
      purchase: {
        select: {
          id: true,
          type: true,
          remainingCount: true,
        },
      },
    },
  });

  if (!purchaseItem) {
    return { success: false, msg: "PurchaseItem not found." };
  }

  const isClip = purchaseItem.purchase.type === "CLIP";
  const amount = Math.abs(adjustment);

  if (purchaseItem.unlimited) {
    return { success: true, msg: "Unlimited purchase; no adjustment made." };
  }

  if (isClip) {
    if (purchaseItem.purchase.remainingCount == null) {
      return { success: false, msg: "Purchase remainingCount is null." };
    }

    if (adjustment < 0) {
      const result = await tx.purchase.updateMany({
        where: {
          id: purchaseItem.purchase.id,
          remainingCount: { gte: amount },
        },
        data: { remainingCount: { decrement: amount } },
      });

      if (result.count === 0) {
        return { success: false, msg: "Insufficient remaining clips." };
      }
    } else {
      await tx.purchase.update({
        where: { id: purchaseItem.purchase.id },
        data: { remainingCount: { increment: amount } },
      });
    }
  } else {
    if (adjustment < 0) {
      const result = await tx.purchaseItem.updateMany({
        where: {
          id: purchaseItem.id,
          remainingCount: { gte: amount },
        },
        data: { remainingCount: { decrement: amount } },
      });

      if (result.count === 0) {
        return { success: false, msg: "Insufficient remaining lessons." };
      }
    } else {
      await tx.purchaseItem.update({
        where: { id: purchaseItem.id },
        data: { remainingCount: { increment: amount } },
      });
    }
  }

  return { success: true };
}

export async function getProductStats(
  productId: string,
  tx?: PrismaTx,
): Promise<{
  sold: number | null;
  reserved: number | null;
  total: number | null;
  spotsLeft: number | null;
  success: boolean;
  error?: string;
}> {
  try {
    const db = tx ?? prisma;

    const product = await db.product.findUniqueOrThrow({
      where: { id: productId },
      select: {
        maxCustomer: true,
        unlimitedCustomers: true,
        countCustomer: true,
      },
    });

    const [soldOrderCount, reservedOrderCount] = await Promise.all([
      db.orderItem.aggregate({
        where: {
          productId,
          order: {
            status: {
              in: ["PAID", "APPROVED", "COMPLETED"],
            },
          },
        },
        _sum: { count: true },
      }),
      db.orderItem.aggregate({
        where: {
          productId,
          order: {
            status: {
              in: ["PENDING_PAYMENT", "AWAITING_APPROVAL"],
            },
          },
        },
        _sum: { count: true },
      }),
    ]);

    return {
      sold: soldOrderCount._sum.count ?? 0,
      reserved: reservedOrderCount._sum.count ?? 0,
      total: product.countCustomer,
      spotsLeft: getProductSpotsLeft(product),
      success: true,
    };
  } catch (e) {
    console.error(e);
    return {
      sold: null,
      reserved: null,
      total: null,
      spotsLeft: null,
      success: false,
      error: "Kunde inte hämta produktstatistik.",
    };
  }
}
