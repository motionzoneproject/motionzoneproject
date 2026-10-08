import { describe, expect, it } from "vitest";
import { getAdminUserFormDefaults } from "@/lib/admin-user-form-defaults";
import { parseCookieConsent } from "@/lib/cookie-consent.shared";
import { pick } from "@/lib/i18n/pick";
import { cn } from "@/lib/utils";

describe("pick", () => {
  const row = {
    name: "Svenska",
    name_en: "English",
    empty: "Sv",
    empty_en: "  ",
  };

  it("ger svenska för sv", () => {
    expect(pick(row, "name", "sv")).toBe("Svenska");
  });

  it("ger engelska för en när den finns", () => {
    expect(pick(row, "name", "en")).toBe("English");
  });

  it("faller tillbaka på svenska för tomma eller saknade översättningar", () => {
    expect(pick(row, "empty", "en")).toBe("Sv");
    const noEn: { title: string; title_en: string | null } = {
      title: "T",
      title_en: null,
    };
    expect(pick(noEn, "title", "en")).toBe("T");
  });
});

describe("parseCookieConsent", () => {
  const valid = {
    necessary: true,
    preferences: false,
    accepted_at: "2026-01-01T00:00:00Z",
    version: 1,
  };

  it("läser ett giltigt samtycke, även URL-kodat", () => {
    expect(parseCookieConsent(JSON.stringify(valid))).toEqual(valid);
    expect(
      parseCookieConsent(encodeURIComponent(JSON.stringify(valid))),
    ).toEqual(valid);
  });

  it("avvisar saknade, trasiga och ofullständiga värden", () => {
    expect(parseCookieConsent(undefined)).toBeNull();
    expect(parseCookieConsent("")).toBeNull();
    expect(parseCookieConsent("{inte json")).toBeNull();
    expect(parseCookieConsent("%E0%A4%A")).toBeNull();
    expect(parseCookieConsent("null")).toBeNull();
    expect(
      parseCookieConsent(JSON.stringify({ ...valid, necessary: false })),
    ).toBeNull();
    expect(
      parseCookieConsent(JSON.stringify({ ...valid, preferences: "ja" })),
    ).toBeNull();
    expect(
      parseCookieConsent(JSON.stringify({ ...valid, version: "1" })),
    ).toBeNull();
  });
});

describe("getAdminUserFormDefaults", () => {
  it("delar kontonamnet när detaljer saknas", () => {
    expect(
      getAdminUserFormDefaults({
        name: "  Anna  Maria Svensson ",
        details: null,
      }),
    ).toEqual({
      firstName: "Anna",
      lastName: "Maria Svensson",
      phoneNumber: "",
      dateOfBirth: "",
      address: "",
      postalCode: "",
      city: "",
      allowPhotoVideo: false,
    });
  });

  it("hanterar ett ensamt namn och ett tomt namn", () => {
    expect(
      getAdminUserFormDefaults({ name: "Cher", details: null }),
    ).toMatchObject({
      firstName: "Cher",
      lastName: "",
    });
    expect(
      getAdminUserFormDefaults({ name: "  ", details: null }),
    ).toMatchObject({
      firstName: "",
      lastName: "",
    });
  });

  it("föredrar sparade detaljer men faller tillbaka för tomma namn", () => {
    expect(
      getAdminUserFormDefaults({
        name: "Konto Namn",
        details: {
          firstName: " Sparad ",
          lastName: "   ",
          phoneNumber: "0701234567",
          address: "Gatan 1",
          postalCode: "12345",
          city: "Norrköping",
          dateOfBirth: "1990-01-01",
          allowPhotoVideo: true,
        },
      }),
    ).toEqual({
      firstName: "Sparad",
      lastName: "Namn",
      phoneNumber: "0701234567",
      dateOfBirth: "1990-01-01",
      address: "Gatan 1",
      postalCode: "12345",
      city: "Norrköping",
      allowPhotoVideo: true,
    });
  });
});

describe("cn", () => {
  it("slår ihop klasser och låter den sista Tailwind-klassen vinna", () => {
    expect(cn("p-2", false && "x", "p-4", ["text-sm"])).toBe("p-4 text-sm");
  });
});
