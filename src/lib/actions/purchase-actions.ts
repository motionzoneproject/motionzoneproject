"use server";
// Så i denna samlar vi actions som rör köpta produkter.

import type { PrismaTx } from "../clips";
import prisma from "../prisma";

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
              "AWAITING_APPROVAL",
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
