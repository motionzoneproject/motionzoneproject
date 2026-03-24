"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { isAdminRole } from "./admin";

export async function adminUpdatePurchaseRemainingCount(input: {
  purchaseId: string;
  purchaseItemId?: string;
  nextTotalCount: number;
}) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, error: "Ingen behörighet." };

  if (!Number.isInteger(input.nextTotalCount) || input.nextTotalCount < 0) {
    return { success: false, error: "Antalet måste vara ett heltal från 0." };
  }

  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: input.purchaseId },
      select: {
        id: true,
        type: true,
        remainingCount: true,
        PurchaseItems: {
          select: {
            id: true,
            bookings: {
              where: { cancelled: false },
              select: { id: true },
            },
          },
        },
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!purchase) {
      return { success: false, error: "Purchase hittades inte." };
    }

    if (purchase.type === "CLIP") {
      const usedCount = purchase.PurchaseItems.reduce(
        (sum, item) => sum + item.bookings.length,
        0,
      );

      if (input.nextTotalCount < usedCount) {
        return {
          success: false,
          error: `Totalt antal kan inte vara lägre än använda klipp (${usedCount}).`,
        };
      }

      await prisma.purchase.update({
        where: { id: input.purchaseId },
        data: { remainingCount: input.nextTotalCount - usedCount },
      });
    } else {
      if (!input.purchaseItemId) {
        return { success: false, error: "PurchaseItem saknas." };
      }

      const purchaseItem = await prisma.purchaseItem.findUnique({
        where: { id: input.purchaseItemId },
        select: {
          id: true,
          unlimited: true,
          bookings: {
            where: { cancelled: false },
            select: { id: true },
          },
        },
      });

      if (!purchaseItem) {
        return { success: false, error: "PurchaseItem hittades inte." };
      }

      if (purchaseItem.unlimited) {
        return {
          success: false,
          error: "Obegränsade purchase items kan inte få ett manuellt saldo.",
        };
      }

      const usedCount = purchaseItem.bookings.length;

      if (input.nextTotalCount < usedCount) {
        return {
          success: false,
          error: `Totalt antal kan inte vara lägre än använda bokningar (${usedCount}).`,
        };
      }

      await prisma.purchaseItem.update({
        where: { id: input.purchaseItemId },
        data: { remainingCount: input.nextTotalCount - usedCount },
      });
    }

    revalidatePath("/admin/students");
    revalidatePath("/admin/lectures");
    revalidatePath("/user");

    return {
      success: true,
      message: `Saldot uppdaterades för ${purchase.product.name}.`,
    };
  } catch (error) {
    console.error("adminUpdatePurchaseRemainingCount error:", error);
    return { success: false, error: "Kunde inte uppdatera saldot." };
  }
}
