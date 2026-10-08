import { describe, expect, it } from "vitest";
import {
  getCourseName,
  getPayMethodTxt,
  getVeckodag,
  getWeekdayAsShort,
  getWeekdays,
} from "@/lib/tools";

const course = {
  name: "Jazz",
  name_en: "Jazz EN",
  minAge: 7 as number | null,
  maxAge: 9 as number | null,
  adult: false,
  level: "Nybörjare" as string | null,
  level_en: "Beginner" as string | null,
};

describe("getCourseName", () => {
  it("bygger namn, åldersspann och nivå på svenska", () => {
    expect(getCourseName(course)).toBe("Jazz 7–9 år - Nybörjare");
  });

  it("bygger samma sak på engelska", () => {
    expect(getCourseName(course, "en")).toBe("Jazz EN 7–9 years - Beginner");
  });

  it("visar öppen övre gräns med +", () => {
    expect(getCourseName({ ...course, maxAge: null, level: null })).toBe(
      "Jazz 7+ år",
    );
    expect(getCourseName({ ...course, maxAge: 0, level: null }, "sv")).toBe(
      "Jazz 7+ år",
    );
  });

  it("lägger till Vuxen efter ett åldersspann", () => {
    expect(
      getCourseName({
        ...course,
        minAge: 16,
        maxAge: null,
        adult: true,
        level: null,
      }),
    ).toBe("Jazz 16+ år / Vuxen");
    expect(
      getCourseName(
        { ...course, minAge: 16, maxAge: null, adult: true, level_en: null },
        "en",
      ),
    ).toBe("Jazz EN 16+ years / Adult");
  });

  it("visar bara Vuxen när minålder saknas", () => {
    expect(
      getCourseName({
        ...course,
        minAge: null,
        maxAge: null,
        adult: true,
        level: null,
      }),
    ).toBe("Jazz Vuxen");
    expect(
      getCourseName({
        ...course,
        minAge: 0,
        maxAge: 0,
        adult: true,
        level: null,
      }),
    ).toBe("Jazz Vuxen");
  });

  it("utelämnar ålder när varken minålder eller vuxen finns", () => {
    expect(
      getCourseName({
        ...course,
        minAge: 0,
        maxAge: 12,
        adult: false,
        level: null,
      }),
    ).toBe("Jazz");
  });

  it("faller tillbaka på svenskt namn när engelskt saknas eller är tomt", () => {
    expect(
      getCourseName({ ...course, name_en: null, level_en: null }, "en"),
    ).toBe("Jazz 7–9 years");
    expect(
      getCourseName({ ...course, name_en: "   ", level_en: null }, "en"),
    ).toBe("Jazz 7–9 years");
  });

  it("använder inte den svenska nivån på engelska", () => {
    expect(getCourseName({ ...course, level_en: null }, "en")).toBe(
      "Jazz EN 7–9 years",
    );
  });

  it("listar veckodagar sorterade och utan dubbletter", () => {
    expect(
      getCourseName(course, "sv", [
        { weekday: "WEDNESDAY" },
        { weekday: "MONDAY" },
        { weekday: "WEDNESDAY" },
        { weekday: "SUNDAY" },
      ]),
    ).toBe("Jazz 7–9 år - Nybörjare (Mån, Ons, Sön)");
    expect(
      getCourseName(course, "en", [
        { weekday: "FRIDAY" },
        { weekday: "TUESDAY" },
      ]),
    ).toBe("Jazz EN 7–9 years - Beginner (Tue, Fri)");
  });

  it("lägger inga tomma parenteser för ett tomt schema", () => {
    expect(getCourseName(course, "sv", [])).toBe("Jazz 7–9 år - Nybörjare");
  });
});

describe("veckodagar och betalsätt", () => {
  it("getWeekdays ger en kopia i ordning måndag–söndag", () => {
    const days = getWeekdays();
    expect(days[0]).toBe("MONDAY");
    expect(days[6]).toBe("SUNDAY");
    days.pop();
    expect(getWeekdays()).toHaveLength(7);
  });

  it("översätter veckodagar", () => {
    expect(getVeckodag("THURSDAY")).toBe("Torsdag");
    expect(getVeckodag("THURSDAY", "en")).toBe("Thursday");
    expect(getWeekdayAsShort("SATURDAY")).toBe("Lör");
    expect(getWeekdayAsShort("SATURDAY", "en")).toBe("Sat");
  });

  it("beskriver betalsätten", () => {
    expect(getPayMethodTxt(1)).toBe("Faktura, hela beloppet");
    expect(getPayMethodTxt(2)).toMatch(/x 2/);
    expect(getPayMethodTxt(3)).toMatch(/x 3/);
    expect(getPayMethodTxt(1, "en")).toBe("Invoice, full amount");
  });
});
