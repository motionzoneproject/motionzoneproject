import { describe, expect, it } from "vitest";
import { getOrderStatusLabel, ORDER_STATUS_LABELS } from "@/lib/order-status";

describe("getOrderStatusLabel", () => {
  it("ger klartext för levande statusar", () => {
    expect(getOrderStatusLabel("AWAITING_APPROVAL")).toBe(
      "Inväntar godkännande",
    );
    expect(getOrderStatusLabel("APPROVED")).toBe("Beviljad");
    expect(getOrderStatusLabel("CANCELLED")).toBe("Avbruten");
  });

  it("låter anroparen byta text för levande statusar", () => {
    expect(getOrderStatusLabel("APPROVED", { APPROVED: "Approved" })).toBe(
      "Approved",
    );
    expect(getOrderStatusLabel("CANCELLED", { APPROVED: "Approved" })).toBe(
      ORDER_STATUS_LABELS.CANCELLED,
    );
  });

  it("ger klartext för historiska statusar i orderloggen", () => {
    expect(getOrderStatusLabel("CREATED")).toBe("Skapad");
    expect(getOrderStatusLabel("PENDING_PAYMENT")).toBe("Väntar på beviljande");
    expect(getOrderStatusLabel("PAID")).toBe("Betald");
    expect(getOrderStatusLabel("COMPLETED")).toBe("Slutförd");
  });

  it("returnerar okända statusar oförändrade", () => {
    expect(getOrderStatusLabel("NÅGOT_NYTT")).toBe("NÅGOT_NYTT");
  });

  it("returnerar strängen även för namn som finns på Object.prototype", () => {
    // Loggen lagras som fri text; en status får aldrig ge tillbaka en funktion.
    for (const s of ["constructor", "toString", "hasOwnProperty"]) {
      expect(getOrderStatusLabel(s)).toBe(s);
    }
  });
});
