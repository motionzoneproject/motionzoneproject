import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calculateAge,
  endOfStockholmDateInput,
  endOfStockholmDay,
  formatDateToInputStr,
  formatFriendlyDate,
  formatFriendlyDateTime,
  formatLongFriendlyDate,
  formatLongFriendlyDateTime,
  formatShortFriendlyDate,
  MONTHS_SHORT_SV,
  parseStockholmDateInput,
  startOfStockholmDay,
} from "@/lib/date-utils";

// TZDate skriver ut med offset; jämför alltid som UTC.
const iso = (d: Date) => new Date(d.getTime()).toISOString();

describe("formatDateToInputStr", () => {
  it("returnerar tom sträng för tomma och ogiltiga värden", () => {
    expect(formatDateToInputStr(null)).toBe("");
    expect(formatDateToInputStr(undefined)).toBe("");
    expect(formatDateToInputStr("")).toBe("");
    expect(formatDateToInputStr("inte ett datum")).toBe("");
    expect(formatDateToInputStr(new Date(Number.NaN))).toBe("");
  });

  it("släpper igenom en färdig ÅÅÅÅ-MM-DD-sträng oförändrad", () => {
    expect(formatDateToInputStr("2026-03-05")).toBe("2026-03-05");
  });

  it("ger den svenska kalenderdagen, inte UTC-dagen", () => {
    // 23:30 UTC är 00:30 nästa dag i Stockholm (vintertid).
    expect(formatDateToInputStr(new Date("2026-01-01T23:30:00Z"))).toBe(
      "2026-01-02",
    );
    // 22:30 UTC är 00:30 nästa dag i Stockholm (sommartid).
    expect(formatDateToInputStr(new Date("2026-10-24T22:30:00Z"))).toBe(
      "2026-10-25",
    );
    // 22:30 UTC är 23:30 samma dag i Stockholm (vintertid).
    expect(formatDateToInputStr(new Date("2026-10-25T22:30:00Z"))).toBe(
      "2026-10-25",
    );
  });

  it("tolkar en ISO-sträng med tid och visar svensk dag", () => {
    expect(formatDateToInputStr("2026-07-01T22:30:00Z")).toBe("2026-07-02");
  });
});

describe("Stockholmsdagar", () => {
  it("parseStockholmDateInput ger midnatt svensk tid", () => {
    expect(iso(parseStockholmDateInput("2026-01-15"))).toBe(
      "2026-01-14T23:00:00.000Z",
    );
    expect(iso(parseStockholmDateInput("2026-07-15"))).toBe(
      "2026-07-14T22:00:00.000Z",
    );
  });

  it("dagen då sommartiden börjar är 23 timmar lång", () => {
    const start = parseStockholmDateInput("2026-03-29");
    const end = endOfStockholmDateInput("2026-03-29");
    expect(iso(start)).toBe("2026-03-28T23:00:00.000Z");
    expect(iso(end)).toBe("2026-03-29T21:59:59.999Z");
    expect(end.getTime() + 1 - start.getTime()).toBe(23 * 3600 * 1000);
  });

  it("dagen då sommartiden slutar är 25 timmar lång", () => {
    const start = parseStockholmDateInput("2026-10-25");
    const end = endOfStockholmDateInput("2026-10-25");
    expect(iso(start)).toBe("2026-10-24T22:00:00.000Z");
    expect(iso(end)).toBe("2026-10-25T22:59:59.999Z");
    expect(end.getTime() + 1 - start.getTime()).toBe(25 * 3600 * 1000);
  });

  it("startOfStockholmDay/endOfStockholmDay omsluter tidpunkten", () => {
    const t = new Date("2026-10-25T12:00:00Z");
    expect(iso(startOfStockholmDay(t))).toBe("2026-10-24T22:00:00.000Z");
    expect(iso(endOfStockholmDay(t))).toBe("2026-10-25T22:59:59.999Z");
  });

  it("en tidpunkt strax efter midnatt svensk tid hör till den nya dagen", () => {
    const t = new Date("2026-01-01T23:30:00Z"); // 00:30 den 2 jan
    expect(iso(startOfStockholmDay(t))).toBe("2026-01-01T23:00:00.000Z");
  });
});

describe("calculateAge", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("räknar hela år", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-09T12:00:00Z"));
    expect(calculateAge("2008-10-09")).toBe(18);
    expect(calculateAge("2008-10-10")).toBe(17);
    expect(calculateAge(new Date("1990-01-01"))).toBe(36);
  });

  it("returnerar null för saknade, ogiltiga och orimliga datum", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-09T12:00:00Z"));
    expect(calculateAge(null)).toBeNull();
    expect(calculateAge(undefined)).toBeNull();
    expect(calculateAge("nonsens")).toBeNull();
    expect(calculateAge("2030-01-01")).toBeNull();
    expect(calculateAge("1800-01-01")).toBeNull();
  });
});

describe("vänliga datumformat", () => {
  // 2026-10-24T22:30Z är söndag 25 oktober 00:30 i Stockholm.
  const lateNight = new Date("2026-10-24T22:30:00Z");
  // 2026-07-01T14:05Z är onsdag 1 juli 16:05 i Stockholm.
  const summer = new Date("2026-07-01T14:05:00Z");

  it("visar svensk dag och svensk tid", () => {
    expect(formatFriendlyDate(lateNight)).toBe("söndag 25 oktober");
    expect(formatFriendlyDateTime(summer)).toBe("onsdag 1 juli 16:05");
    expect(formatLongFriendlyDate(summer)).toBe("onsdag 1 juli 2026");
    expect(formatLongFriendlyDateTime(lateNight)).toBe(
      "söndag 25 oktober 2026 00:30",
    );
  });

  it("stöder engelska", () => {
    expect(formatFriendlyDate(lateNight, "en-GB")).toBe("Sunday 25 October");
    expect(formatShortFriendlyDate(summer, "en-GB")).toBe("1 Jul 2026");
  });

  it("faller tillbaka på svenska för okända språk", () => {
    expect(formatFriendlyDate(lateNight, "de-DE")).toBe(
      formatFriendlyDate(lateNight, "sv-SE"),
    );
  });

  it("har tolv svenska månadsförkortningar", () => {
    expect(MONTHS_SHORT_SV).toHaveLength(12);
    expect(MONTHS_SHORT_SV[4]).toBe("maj");
    expect(MONTHS_SHORT_SV[9]).toBe("okt");
  });
});
