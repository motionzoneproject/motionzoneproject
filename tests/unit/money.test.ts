import { describe, expect, it } from "vitest";
import { formatPrice, oreToSek, sekToOre } from "@/lib/money";

/** Intl använder hårda mellanslag (U+00A0 / U+202F); jämför med vanliga. */
const plain = (s: string) => s.replace(/[  ]/g, " ");

describe("formatPrice", () => {
  it("visar hela kronor på svenska", () => {
    expect(plain(formatPrice(15000))).toBe("150 kr");
  });

  it("använder svensk tusentalsavgränsning", () => {
    expect(plain(formatPrice(1234500))).toBe("12 345 kr");
  });

  it("avrundar ören till hela kronor", () => {
    expect(plain(formatPrice(15049))).toBe("150 kr");
    expect(plain(formatPrice(15050))).toBe("151 kr");
  });

  it("visar noll", () => {
    expect(plain(formatPrice(0))).toBe("0 kr");
  });

  it("visar SEK på engelska utan att växla valuta", () => {
    expect(plain(formatPrice(15000, "en"))).toBe("SEK 150");
  });
});

describe("sekToOre / oreToSek", () => {
  it("räknar om kronor till ören", () => {
    expect(sekToOre(150)).toBe(15000);
    expect(sekToOre(0)).toBe(0);
  });

  it("tål flyttalsfel i decimala kronor", () => {
    // 19.99 * 100 === 1998.9999999999998
    expect(sekToOre(19.99)).toBe(1999);
    expect(sekToOre(0.1 + 0.2)).toBe(30);
  });

  it("räknar om ören till hela kronor", () => {
    expect(oreToSek(15000)).toBe(150);
    expect(oreToSek(15049)).toBe(150);
    expect(oreToSek(15050)).toBe(151);
  });

  it("är varandras invers för hela kronor", () => {
    for (const sek of [0, 1, 99, 150, 4995]) {
      expect(oreToSek(sekToOre(sek))).toBe(sek);
    }
  });
});
