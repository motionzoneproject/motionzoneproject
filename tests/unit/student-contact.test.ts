import { describe, expect, it } from "vitest";
import {
  contactForParticipant,
  contactForUser,
  type ParticipantContactSource,
  participantBirthDate,
} from "@/lib/student-contact";

const parent = {
  email: "forälder@example.com",
  details: { phoneNumber: "070-111 11 11" },
};

function participant(
  overrides: Partial<ParticipantContactSource> = {},
): ParticipantContactSource {
  return {
    phone: null,
    email: null,
    user: null,
    addedBy: parent,
    ...overrides,
  };
}

describe("contactForParticipant", () => {
  it("använder deltagarens egna uppgifter i första hand", () => {
    expect(
      contactForParticipant(
        participant({ phone: "073-222 22 22", email: "barn@example.com" }),
      ),
    ).toEqual({
      phone: { value: "073-222 22 22", viaCustomer: false },
      email: { value: "barn@example.com", viaCustomer: false },
    });
  });

  it("använder deltagarens eget konto när deltagaren saknar uppgifter", () => {
    expect(
      contactForParticipant(
        participant({
          user: {
            email: "vuxen@example.com",
            details: { phoneNumber: "076-333 33 33" },
          },
        }),
      ),
    ).toEqual({
      phone: { value: "076-333 33 33", viaCustomer: false },
      email: { value: "vuxen@example.com", viaCustomer: false },
    });
  });

  it("faller tillbaka på kontohavaren (föräldern) och markerar det", () => {
    expect(contactForParticipant(participant())).toEqual({
      phone: { value: "070-111 11 11", viaCustomer: true },
      email: { value: "forälder@example.com", viaCustomer: true },
    });
  });

  it("väljer telefon och mejl var för sig", () => {
    expect(
      contactForParticipant(participant({ phone: "073-222 22 22" })),
    ).toEqual({
      phone: { value: "073-222 22 22", viaCustomer: false },
      email: { value: "forälder@example.com", viaCustomer: true },
    });
  });

  it("räknar tomma strängar som saknade", () => {
    expect(
      contactForParticipant(participant({ phone: "  ", email: "" })),
    ).toEqual({
      phone: { value: "070-111 11 11", viaCustomer: true },
      email: { value: "forälder@example.com", viaCustomer: true },
    });
  });

  it("ger null när ingen har ett telefonnummer", () => {
    expect(
      contactForParticipant(
        participant({ addedBy: { email: "a@example.com", details: null } }),
      ).phone,
    ).toBeNull();
  });
});

describe("participantBirthDate", () => {
  const kid = new Date("2016-05-01T00:00:00Z");
  const adult = new Date("1990-02-03T00:00:00Z");

  it("använder deltagarens eget födelsedatum", () => {
    expect(participantBirthDate({ dateOfBirth: kid, user: null })).toEqual(kid);
  });

  it("använder deltagarens eget konto när deltagaren saknar datum", () => {
    expect(
      participantBirthDate({
        dateOfBirth: null,
        user: { details: { dateOfBirth: adult } },
      }),
    ).toEqual(adult);
  });

  it("går före kontots datum när båda finns", () => {
    expect(
      participantBirthDate({
        dateOfBirth: kid,
        user: { details: { dateOfBirth: adult } },
      }),
    ).toEqual(kid);
  });

  it("ger null hellre än att gissa, och tar aldrig emot kontohavaren", () => {
    // Funktionen tar inte ens emot addedBy: förälderns ålder kan inte
    // hamna på barnet.
    expect(participantBirthDate({ dateOfBirth: null, user: null })).toBeNull();
  });
});

describe("contactForUser", () => {
  it("använder kontots egna uppgifter, aldrig som kundens", () => {
    expect(contactForUser(parent)).toEqual({
      phone: { value: "070-111 11 11", viaCustomer: false },
      email: { value: "forälder@example.com", viaCustomer: false },
    });
  });

  it("ger null för telefon när kontot saknar nummer", () => {
    expect(
      contactForUser({ email: "a@example.com", details: null }).phone,
    ).toBeNull();
  });
});
