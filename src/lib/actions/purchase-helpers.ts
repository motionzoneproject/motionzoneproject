import type { ProductType } from "@/generated/prisma/enums";

// Hjälparfunktion för att räkna ut remaining.
export function calcRemainingCount(input: {
  purchase: { type: "CLIP" | "PACK" | "COURSE"; remainingCount: number | null };
  purchaseItem: { unlimited: boolean; remainingCount: number | null };
}): number {
  // Ingen check krävs här, då den förutsätter att data redan hämtats.

  if (input.purchaseItem.unlimited) return Infinity;
  return input.purchase.type === "CLIP"
    ? (input.purchase.remainingCount ?? 0)
    : (input.purchaseItem.remainingCount ?? 0);
}

export function hasRemainingCount(remaining: number): boolean {
  return remaining === Infinity || remaining > 0;
}

export function isLowRemainingCount(remaining: number): boolean {
  return Number.isFinite(remaining) && remaining <= 2; // Tänekr att <2 borde räknas som lågt.
}

export function showTypeInSwedish(type: ProductType) {
  if (type === "CLIP") return "Klippkort";
  if (type === "COURSE") return "Klippkort";
  if (type === "PACK") return "Klippkort";
}

export function showRemaining(nr: number) {
  const show = nr === Infinity ? "∞" : nr;
  return show;
}
