import { describe, expect, it } from "vitest";
import {
  ageAt,
  checkInvoiceName,
  checkInvoiceRecipient,
  INVOICE_RECIPIENT_ERRORS,
  isMinor,
  normalizeName,
  resolveInvoiceRecipient,
} from "@/lib/invoice-recipient";

// Fast "nu": fredag 9 oktober 2026 kl 12 svensk tid.
const AT = new Date("2026-10-09T10:00:00Z");
const ADULT_DOB = "1980-05-05";
const MINOR_DOB = "2012-05-05";

describe("normalizeName", () => {
  it("gör gemener och drar ihop blanksteg", () => {
    expect(normalizeName("  Anna   SVENSSON ")).toBe("anna svensson");
    expect(normalizeName("Anna\tSvensson")).toBe("anna svensson");
  });
});

describe("ageAt", () => {
  // Födelsedatum sparas som midnatt svensk tid: 2008-10-09 00:00 CEST.
  const born = new Date("2008-10-08T22:00:00Z");

  it("fyller år på födelsedagen i svensk tid", () => {
    // 2026-10-09 00:00 svensk tid = 2026-10-08T22:00Z.
    expect(ageAt(born, new Date("2026-10-08T22:00:00Z"))).toBe(18);
  });

  it("är ett år yngre minuten före midnatt svensk tid", () => {
    expect(ageAt(born, new Date("2026-10-08T21:59:00Z"))).toBe(17);
  });

  it("räknar svensk dag även när UTC fortfarande är dagen innan", () => {
    // En server i UTC ser 2026-10-08 22:30 — i Stockholm har dagen börjat.
    expect(ageAt(born, new Date("2026-10-08T22:30:00Z"))).toBe(18);
  });

  it("hanterar skottdagsbarn", () => {
    const leap = new Date("2008-02-28T23:00:00Z"); // 2008-02-29 00:00 CET
    expect(ageAt(leap, new Date("2026-02-28T12:00:00Z"))).toBe(17);
    expect(ageAt(leap, new Date("2026-03-01T12:00:00Z"))).toBe(18);
  });

  it("använder dagens datum som standard", () => {
    expect(ageAt(new Date("1900-01-01T00:00:00Z"))).toBeGreaterThan(100);
  });
});

describe("isMinor", () => {
  it("okänt födelsedatum ställer inga extra krav", () => {
    expect(isMinor(null, AT)).toBe(false);
    expect(isMinor(undefined, AT)).toBe(false);
    expect(isMinor("", AT)).toBe(false);
    expect(isMinor("inte ett datum", AT)).toBe(false);
  });

  it("tar emot både Date och ÅÅÅÅ-MM-DD", () => {
    expect(isMinor(MINOR_DOB, AT)).toBe(true);
    expect(isMinor(new Date(MINOR_DOB), AT)).toBe(true);
    expect(isMinor(ADULT_DOB, AT)).toBe(false);
  });

  it("är myndig från och med 18-årsdagen", () => {
    expect(isMinor("2008-10-09", AT)).toBe(false);
    expect(isMinor("2008-10-10", AT)).toBe(true);
  });

  it("en sträng från formuläret räknas som svensk dag strax efter midnatt", () => {
    // 2026-10-09 00:30 svensk tid; i UTC är det fortfarande den 8:e.
    expect(isMinor("2008-10-09", new Date("2026-10-08T22:30:00Z"))).toBe(false);
  });
});

describe("checkInvoiceName", () => {
  it("stoppar kontots eget namn när kontot är omyndigt", () => {
    expect(
      checkInvoiceName({
        invoiceName: "  ANNA  svensson ",
        accountName: "Anna Svensson",
        accountDateOfBirth: MINOR_DOB,
        at: AT,
      }),
    ).toBe("minorAccount");
  });

  it("släpper igenom kontots namn när kontot är myndigt eller ålder saknas", () => {
    for (const dob of [ADULT_DOB, null]) {
      expect(
        checkInvoiceName({
          invoiceName: "Anna Svensson",
          accountName: "Anna Svensson",
          accountDateOfBirth: dob,
          at: AT,
        }),
      ).toBeNull();
    }
  });

  it("stoppar namnet på en omyndig deltagare", () => {
    expect(
      checkInvoiceName({
        invoiceName: "lilla  kalle",
        accountName: "Förälder",
        accountDateOfBirth: ADULT_DOB,
        participants: [{ name: "Lilla Kalle", dateOfBirth: MINOR_DOB }],
        at: AT,
      }),
    ).toBe("minorParticipant");
  });

  it("släpper igenom en myndig deltagare eller en utan födelsedatum", () => {
    expect(
      checkInvoiceName({
        invoiceName: "Stora Kalle",
        accountName: "Förälder",
        accountDateOfBirth: null,
        participants: [
          { name: "Stora Kalle", dateOfBirth: ADULT_DOB },
          { name: "Okänd" },
        ],
        at: AT,
      }),
    ).toBeNull();
  });

  it("gör bara kontokontrollen när deltagare saknas", () => {
    expect(
      checkInvoiceName({
        invoiceName: "Vem Som Helst",
        accountName: "Förälder",
        accountDateOfBirth: MINOR_DOB,
        at: AT,
      }),
    ).toBeNull();
  });
});

describe("checkInvoiceRecipient", () => {
  const common = {
    adultConfirmed: false,
    accountName: "Förälder",
    accountDateOfBirth: ADULT_DOB,
    at: AT,
  };

  it("kräver ett namn med minst två tecken", () => {
    expect(
      checkInvoiceRecipient({ ...common, kind: "other", chosenName: " a " }),
    ).toBe("missingName");
    expect(
      checkInvoiceRecipient({ ...common, kind: "self", chosenName: "" }),
    ).toBe("missingName");
  });

  it("stoppar en omyndig kontoinnehavare, även med intyg", () => {
    expect(
      checkInvoiceRecipient({
        ...common,
        kind: "self",
        chosenName: "Barn",
        chosenDateOfBirth: MINOR_DOB,
        adultConfirmed: true,
      }),
    ).toBe("minorAccount");
  });

  it("stoppar en omyndig deltagare, även med intyg", () => {
    expect(
      checkInvoiceRecipient({
        ...common,
        kind: "participant",
        chosenName: "Barn",
        chosenDateOfBirth: MINOR_DOB,
        adultConfirmed: true,
      }),
    ).toBe("minorParticipant");
  });

  it("släpper igenom en känd vuxen utan intyg", () => {
    for (const kind of ["self", "participant"] as const) {
      expect(
        checkInvoiceRecipient({
          ...common,
          kind,
          chosenName: "Vuxen",
          chosenDateOfBirth: ADULT_DOB,
        }),
      ).toBeNull();
    }
  });

  it("kräver intyg när åldern är okänd", () => {
    expect(
      checkInvoiceRecipient({ ...common, kind: "self", chosenName: "Okänd" }),
    ).toBe("unconfirmedAge");
    expect(
      checkInvoiceRecipient({
        ...common,
        kind: "self",
        chosenName: "Okänd",
        adultConfirmed: true,
      }),
    ).toBeNull();
  });

  it("kräver inget intyg när requireConfirmation är av", () => {
    expect(
      checkInvoiceRecipient({
        ...common,
        kind: "participant",
        chosenName: "Okänd",
        requireConfirmation: false,
      }),
    ).toBeNull();
    expect(
      checkInvoiceRecipient({
        ...common,
        kind: "other",
        chosenName: "Någon Annan",
        requireConfirmation: false,
      }),
    ).toBeNull();
  });

  it("'annan' kräver alltid intyg", () => {
    expect(
      checkInvoiceRecipient({
        ...common,
        kind: "other",
        chosenName: "Någon Annan",
        chosenDateOfBirth: ADULT_DOB,
      }),
    ).toBe("unconfirmedAge");
  });

  it("'annan' med intyg prövas fortfarande mot omyndiga namn", () => {
    expect(
      checkInvoiceRecipient({
        ...common,
        kind: "other",
        chosenName: "lilla kalle",
        adultConfirmed: true,
        participants: [{ name: "Lilla Kalle", dateOfBirth: MINOR_DOB }],
      }),
    ).toBe("minorParticipant");
    expect(
      checkInvoiceRecipient({
        ...common,
        kind: "other",
        chosenName: "Barnkonto",
        adultConfirmed: true,
        accountName: "Barnkonto",
        accountDateOfBirth: MINOR_DOB,
      }),
    ).toBe("minorAccount");
    expect(
      checkInvoiceRecipient({
        ...common,
        kind: "other",
        chosenName: "Mormor",
        adultConfirmed: true,
      }),
    ).toBeNull();
  });

  it("har en feltext för varje utfall", () => {
    for (const key of [
      "minorAccount",
      "minorParticipant",
      "unconfirmedAge",
      "missingName",
      "unknownParticipant",
    ] as const) {
      expect(INVOICE_RECIPIENT_ERRORS[key]).toBeTruthy();
    }
  });
});

describe("resolveInvoiceRecipient", () => {
  const choiceBase = {
    invoiceEmail: "faktura@example.com",
    invoicePhone: "",
    adultConfirmed: false,
  };
  const participants = [
    { id: "p-barn", name: "Lilla Kalle", dateOfBirth: MINOR_DOB },
    { id: "p-vuxen", name: "Stora Kalle", dateOfBirth: ADULT_DOB },
    { id: "p-okand", name: "Okänd Ålder", dateOfBirth: null },
  ];

  it("'jag själv' tar namnet från kontot, inte från klienten", () => {
    const result = resolveInvoiceRecipient({
      choice: {
        ...choiceBase,
        kind: "self",
        invoiceName: "Påhittat Namn",
        adultConfirmed: true,
      },
      account: { name: "  Förälder Ett ", dateOfBirth: ADULT_DOB },
      participants,
      at: AT,
    });
    expect(result).toEqual({
      recipient: {
        invoiceName: "Förälder Ett",
        invoiceEmail: "faktura@example.com",
        invoicePhone: null,
        // Åldern var känd, så inget intyg ska påstås.
        invoiceAdultConfirmedAt: null,
      },
    });
  });

  it("en deltagare som inte hör till ordern avvisas", () => {
    expect(
      resolveInvoiceRecipient({
        choice: {
          ...choiceBase,
          kind: "participant",
          participantId: "främmande",
        },
        account: { name: "Förälder" },
        participants,
        at: AT,
      }),
    ).toEqual({ problem: "unknownParticipant" });
    expect(
      resolveInvoiceRecipient({
        choice: { ...choiceBase, kind: "participant" },
        account: { name: "Förälder" },
        participants,
        at: AT,
      }),
    ).toEqual({ problem: "unknownParticipant" });
  });

  it("en omyndig deltagare avvisas", () => {
    expect(
      resolveInvoiceRecipient({
        choice: {
          ...choiceBase,
          kind: "participant",
          participantId: "p-barn",
          adultConfirmed: true,
        },
        account: { name: "Förälder" },
        participants,
        at: AT,
      }),
    ).toEqual({ problem: "minorParticipant" });
  });

  it("en deltagare utan födelsedatum får intyget stämplat", () => {
    const result = resolveInvoiceRecipient({
      choice: {
        ...choiceBase,
        kind: "participant",
        participantId: "p-okand",
        invoicePhone: "070-1234567",
        adultConfirmed: true,
      },
      account: { name: "Förälder" },
      participants,
      at: AT,
    });
    expect(result).toEqual({
      recipient: {
        invoiceName: "Okänd Ålder",
        invoiceEmail: "faktura@example.com",
        invoicePhone: "070-1234567",
        invoiceAdultConfirmedAt: AT,
      },
    });
  });

  it("'annan' trimmar fritexten och stämplar intyget", () => {
    const result = resolveInvoiceRecipient({
      choice: {
        ...choiceBase,
        kind: "other",
        invoiceName: "  Mormor Svensson  ",
        adultConfirmed: true,
      },
      account: { name: "Förälder", dateOfBirth: ADULT_DOB },
      participants,
      at: AT,
    });
    expect(result).toEqual({
      recipient: {
        invoiceName: "Mormor Svensson",
        invoiceEmail: "faktura@example.com",
        invoicePhone: null,
        invoiceAdultConfirmedAt: AT,
      },
    });
  });

  it("'annan' utan namn eller intyg avvisas", () => {
    expect(
      resolveInvoiceRecipient({
        choice: { ...choiceBase, kind: "other", adultConfirmed: true },
        account: { name: "Förälder" },
        participants,
        at: AT,
      }),
    ).toEqual({ problem: "missingName" });
    expect(
      resolveInvoiceRecipient({
        choice: { ...choiceBase, kind: "other", invoiceName: "Mormor" },
        account: { name: "Förälder" },
        participants,
        at: AT,
      }),
    ).toEqual({ problem: "unconfirmedAge" });
  });

  it("utan krav på intyg stämplas inget intyg som inte gavs", () => {
    const result = resolveInvoiceRecipient({
      choice: { ...choiceBase, kind: "self" },
      account: { name: "Förälder", dateOfBirth: null },
      participants: [],
      requireConfirmation: false,
      at: AT,
    });
    expect(result).toEqual({
      recipient: expect.objectContaining({ invoiceAdultConfirmedAt: null }),
    });
  });
});
