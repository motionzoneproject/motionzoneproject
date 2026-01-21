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
