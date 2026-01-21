// Så i denna samlar vi actions som rör köpta produkter.

import type { Prisma } from "@/generated/prisma/client";
import prisma from "../prisma";
import { getSessionData } from "./sessiondata";

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

// Hjälparfunktion för att räkna ut remaining.
export function calcRemainingCount(input: {
  unlimited: boolean;
  remainingCount: number | null;
  purchase: { type: "CLIP" | "PACK" | "COURSE"; remainingCount: number | null };
}): number {
  // Ingen check krävs här, då den förutsätter att data redan hämtats.

  if (input.unlimited) return Infinity;
  return input.purchase.type === "CLIP"
    ? (input.purchase.remainingCount ?? 0)
    : (input.remainingCount ?? 0);
}

export function hasRemainingCount(remaining: number): boolean {
  return remaining === Infinity || remaining > 0;
}

export function isLowRemainingCount(remaining: number): boolean {
  return Number.isFinite(remaining) && remaining <= 2; // Tänekr att <2 borde räknas som lågt.
}

// Hjälparfunktion för att hämta remainingCount kopplat till en purchaseItem och utföra en calc.
// Man kan skicka med en tx.
export async function getRemainingCount(
  purchaseItemId: string,
  passTx?: PrismaTx,
): Promise<{ success: boolean; count?: number; msg?: string }> {
  try {
    const session = await getSessionData();
    const user = session?.user;
    const userId = user?.id;

    // Om vi senare vill ge en participant (som ev också är user) access, behöver man utöka checken,
    //  men det är en separat policy‑fråga. pot. fix.
    if (!userId || user.role !== "admin") {
      return { success: false, msg: "Inte inloggad eller admin." };
    }

    const tx = passTx ?? prisma;

    const purchaseItem = await tx.purchaseItem.findUnique({
      where: { id: purchaseItemId },
      select: {
        unlimited: true,
        remainingCount: true,
        purchase: {
          select: {
            userId: true,
            type: true,
            remainingCount: true,
          },
        },
      },
    });

    if (!purchaseItem)
      return {
        success: false,
        msg: `PurchaseItem med id ${purchaseItemId} hittades inte.`,
      };

    if (user?.role !== "admin" && purchaseItem.purchase.userId !== userId) {
      return { success: false, msg: "Saknar åtkomst till purchaseItem." };
    }

    // Använder calc-funktionen:
    const count = calcRemainingCount({
      unlimited: purchaseItem.unlimited,
      remainingCount: purchaseItem.remainingCount,
      purchase: {
        type: purchaseItem.purchase.type,
        remainingCount: purchaseItem.purchase.remainingCount,
      },
    });

    if (count == null)
      return { success: false, msg: "No numeric remaining count." };
    return { success: true, count: count }; // Tänk på att det kan vara infinity, så vi hanterar det isf där vi anropar.
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
  }
}
