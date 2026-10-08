import { describe, expect, it } from "vitest";
import {
  calcRemainingCount,
  hasRemainingCount,
  isLowRemainingCount,
  showRemaining,
  showTypeInSwedish,
} from "@/lib/actions/purchase-helpers";

describe("calcRemainingCount", () => {
  it("är oändligt för obegränsade rader, oavsett typ", () => {
    expect(
      calcRemainingCount({
        purchase: { type: "CLIP", remainingCount: 3 },
        purchaseItem: { unlimited: true, remainingCount: 0 },
      }),
    ).toBe(Infinity);
  });

  it("läser klippkortets saldo från köpet", () => {
    expect(
      calcRemainingCount({
        purchase: { type: "CLIP", remainingCount: 7 },
        purchaseItem: { unlimited: false, remainingCount: 99 },
      }),
    ).toBe(7);
  });

  it("läser kurs- och paketsaldo från raden", () => {
    for (const type of ["COURSE", "PACK"] as const) {
      expect(
        calcRemainingCount({
          purchase: { type, remainingCount: 99 },
          purchaseItem: { unlimited: false, remainingCount: 4 },
        }),
      ).toBe(4);
    }
  });

  it("behandlar null som 0", () => {
    expect(
      calcRemainingCount({
        purchase: { type: "CLIP", remainingCount: null },
        purchaseItem: { unlimited: false, remainingCount: 5 },
      }),
    ).toBe(0);
    expect(
      calcRemainingCount({
        purchase: { type: "COURSE", remainingCount: 5 },
        purchaseItem: { unlimited: false, remainingCount: null },
      }),
    ).toBe(0);
  });
});

describe("saldohjälpare", () => {
  it("hasRemainingCount", () => {
    expect(hasRemainingCount(Infinity)).toBe(true);
    expect(hasRemainingCount(1)).toBe(true);
    expect(hasRemainingCount(0)).toBe(false);
    expect(hasRemainingCount(-1)).toBe(false);
  });

  it("isLowRemainingCount gäller bara ändliga saldon upp till 2", () => {
    expect(isLowRemainingCount(Infinity)).toBe(false);
    expect(isLowRemainingCount(3)).toBe(false);
    expect(isLowRemainingCount(2)).toBe(true);
    expect(isLowRemainingCount(0)).toBe(true);
  });

  it("showRemaining visar ∞ för obegränsat", () => {
    expect(showRemaining(Infinity)).toBe("∞");
    expect(showRemaining(4)).toBe(4);
  });

  it("showTypeInSwedish", () => {
    expect(showTypeInSwedish("CLIP")).toBe("Klippkort");
    expect(showTypeInSwedish("COURSE")).toBe("Kurs");
    expect(showTypeInSwedish("PACK")).toBe("Paket");
  });
});
