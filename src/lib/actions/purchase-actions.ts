"use server";
// Så i denna samlar vi actions som rör köpta produkter.

import type { Prisma } from "@/generated/prisma/client";
import prisma from "../prisma";

// Behöver den här typen för att fortsätta en tx:
export type PrismaTx = Prisma.TransactionClient;

// // Okej, så nu den magiska funktionen handleClips då :)
export async function handleClips(
  tx: PrismaTx,
  purchaseItemId: string,
  adjustment: number,
): Promise<{ success: boolean; msg?: string }> {
  if (adjustment === 0) {
    return { success: true, msg: "No adjustment needed." };
  }

  // Så vi hämtar purschaseItem, och inkluderar även purchasen så vi kan se vilken typ det är (CLIP, PACK eller COURSE). Kolla även unlimited.
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

  // Om den inte hittas, returnera false.
  if (!purchaseItem) {
    return { success: false, msg: "PurchaseItem not found." };
  }

  // kolla om det är ett klippkort:
  const isClip = purchaseItem.purchase.type === "CLIP";
  const amount = Math.abs(adjustment); // amoint som absolutbelopp, avgör istället med if sats..

  if (purchaseItem.unlimited) {
    return { success: true, msg: "Unlimited purchase; no adjustment made." };
  }

  if (isClip) {
    // Varför skulle den vara null dock?
    if (purchaseItem.purchase.remainingCount == null) {
      return { success: false, msg: "Purchase remainingCount is null." };
    }

    // Kolla om det skall dras eller ges tillbaka.
    if (adjustment < 0) {
      // Uppdatera saldot i purchases ( eftersom det är ett klippkort )
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
    // det är kurser / paket och just denna kurs skall alltså ges tillbaka eller dras.

    // Kolla om det skall dras eller ges tillbaka :)
    if (adjustment < 0) {
      const result = await tx.purchaseItem.updateMany({
        where: {
          id: purchaseItem.id,
          remainingCount: { gte: amount }, // Hämta bara om det finns så många bokningar kvar.
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

// Så denna funktion räknar antal redan sålda produkter av den specifika produkten, och om man vill räkna med de som ligger och väntar i order.
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
  // 1. Hämta alla purchases med det produktId:t.
  try {
    const db = tx ?? prisma;

    const product = await db.product.findUniqueOrThrow({
      where: { id: productId },
      select: { maxCustomer: true, unlimitedCustomers: true },
    });

    const sold = await db.purchase.count({
      where: {
        productId: productId,
        order: { status: { not: "CANCELLED" } },
      },
    });

    const orderCount = await db.orderItem.aggregate({
      where: {
        productId,
        order: {
          status: {
            in: [
              "CREATED",
              "PENDING_PAYMENT",
              "AWAITING_APPROVAL",
              "PAID",
              "APPROVED", // Så inte CANCELLED räknas med.
            ],
          },
          // Förhindra dubbelräkning när purchase redan skapats för denna produkt.
          purchases: { none: { productId } },
        },
      },
      _sum: { count: true },
    });

    const reserved = orderCount._sum.count ?? 0;

    return {
      sold: sold,
      reserved: reserved,
      total: sold + reserved,
      spotsLeft: product.unlimitedCustomers
        ? Infinity
        : Math.max(0, product.maxCustomer - (sold + reserved)),
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
