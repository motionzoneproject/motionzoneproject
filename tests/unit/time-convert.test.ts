import { describe, expect, it } from "vitest";
import {
  dbToFormTime,
  formToDbDate,
  getZonedHoursMinutes,
  stockholmLocalToDate,
} from "@/lib/time-convert";

describe("formToDbDate", () => {
  it("lägger en ren tid på 1970-01-01 i svensk vintertid (UTC+1)", () => {
    expect(formToDbDate("16:15").toISOString()).toBe(
      "1970-01-01T15:15:00.000Z",
    );
  });

  it("tål blanksteg runt tiden", () => {
    expect(formToDbDate(" 08:00 ").toISOString()).toBe(
      "1970-01-01T07:00:00.000Z",
    );
  });

  it("tolkar ett vinterdatum som midnatt svensk tid (UTC+1)", () => {
    expect(formToDbDate("2026-01-01").toISOString()).toBe(
      "2025-12-31T23:00:00.000Z",
    );
  });

  it("tolkar ett sommardatum som midnatt svensk sommartid (UTC+2)", () => {
    expect(formToDbDate("2026-07-01").toISOString()).toBe(
      "2026-06-30T22:00:00.000Z",
    );
  });

  it("hanterar dagen då sommartiden börjar (2026-03-29)", () => {
    // Midnatt är fortfarande vintertid; omställningen sker 02:00.
    expect(formToDbDate("2026-03-29").toISOString()).toBe(
      "2026-03-28T23:00:00.000Z",
    );
    expect(formToDbDate("2026-03-29T03:30:00").toISOString()).toBe(
      "2026-03-29T01:30:00.000Z",
    );
  });

  it("hanterar dagen då sommartiden slutar (2026-10-25)", () => {
    expect(formToDbDate("2026-10-25").toISOString()).toBe(
      "2026-10-24T22:00:00.000Z",
    );
    expect(formToDbDate("2026-10-25T12:00:00").toISOString()).toBe(
      "2026-10-25T11:00:00.000Z",
    );
  });

  it("tolkar en fullständig sträng som svensk tid", () => {
    expect(formToDbDate("1970-01-01T16:15:00").toISOString()).toBe(
      "1970-01-01T15:15:00.000Z",
    );
  });

  it("kastar för tomma och otolkbara värden", () => {
    expect(() => formToDbDate("")).toThrow();
    expect(() => formToDbDate(undefined as unknown as string)).toThrow();
    expect(() => formToDbDate("inte en tid")).toThrow(/kunde inte tolka/);
  });
});

describe("dbToFormTime / getZonedHoursMinutes", () => {
  it("visar en vintertid i svensk tid", () => {
    expect(dbToFormTime(new Date("1970-01-01T15:15:00Z"))).toBe("16:15");
  });

  it("visar en sommartid i svensk tid", () => {
    expect(dbToFormTime(new Date("2026-07-01T14:05:00Z"))).toBe("16:05");
  });

  it("nollfyller timmar och minuter", () => {
    expect(dbToFormTime(new Date("2026-01-15T08:05:00Z"))).toBe("09:05");
  });

  it("visar midnatt som 00:00, inte 24:00", () => {
    expect(dbToFormTime(new Date("2026-01-01T23:00:00Z"))).toBe("00:00");
    expect(getZonedHoursMinutes(new Date("2026-06-30T22:00:00Z"))).toEqual({
      hours: 0,
      minutes: 0,
    });
  });

  it("går fram och tillbaka utan att klockslaget ändras", () => {
    for (const t of ["00:00", "08:30", "16:15", "23:59"]) {
      expect(dbToFormTime(formToDbDate(t))).toBe(t);
    }
  });

  it("ger samma klockslag före och efter omställningen till vintertid", () => {
    expect(dbToFormTime(formToDbDate("2026-10-24T17:00:00"))).toBe("17:00");
    expect(dbToFormTime(formToDbDate("2026-10-26T17:00:00"))).toBe("17:00");
  });
});

// Funktionerna ska ge samma tidpunkt oavsett serverns tidszon. CI kör i UTC
// och dessutom i en tredje zon (se .github/workflows/ci.yml); utvecklarna
// kör i svensk tid.
describe("stockholmLocalToDate", () => {
  it("tolkar väggklocktid som svensk tid, vinter och sommar", () => {
    expect(stockholmLocalToDate("2026-01-15T09:00").toISOString()).toBe(
      "2026-01-15T08:00:00.000Z",
    );
    expect(stockholmLocalToDate("2026-07-15T09:00:00").toISOString()).toBe(
      "2026-07-15T07:00:00.000Z",
    );
    expect(stockholmLocalToDate("2026-07-15").toISOString()).toBe(
      "2026-07-14T22:00:00.000Z",
    );
  });

  it("lämnar en sträng med egen tidszon orörd", () => {
    expect(stockholmLocalToDate("2026-07-15T09:00:00Z").toISOString()).toBe(
      "2026-07-15T09:00:00.000Z",
    );
  });

  it("ger ett ogiltigt datum för skräp", () => {
    expect(Number.isNaN(stockholmLocalToDate("inte ett datum").getTime())).toBe(
      true,
    );
  });
});
