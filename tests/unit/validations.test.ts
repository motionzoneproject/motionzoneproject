import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import {
  adminAddCourseToSchemaSchema,
  adminAddTerminSchema,
  adminBulkCancelLessonsSchema,
  adminGalleryItemSchema,
  adminProductSchema,
  adminStudioSchema,
} from "@/validations/adminforms";
import {
  SignInFormSchema,
  SignUpFormSchema,
} from "@/validations/betterauthforms";
import {
  InvoiceRecipientSchema,
  ParticipantSchema,
  UserDetailsSchema,
  UserPasswordSchema,
} from "@/validations/userforms";

/** Sökvägarna till fälten som underkändes, t.ex. ["timeEnd"]. */
function failedPaths(schema: z.ZodType, input: unknown): string[] {
  const result = schema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.map((i) => i.path.join("."));
}

describe("adminAddCourseToSchemaSchema", () => {
  const valid = {
    courseId: "c1",
    timeStart: "17:00",
    timeEnd: "18:30",
    day: "MONDAY",
  };

  it("godtar en giltig rad", () => {
    expect(adminAddCourseToSchemaSchema.safeParse(valid).success).toBe(true);
  });

  it("kräver HH:MM med giltiga timmar och minuter", () => {
    for (const t of ["9:00", "24:00", "12:60", "1200", "12:00:00"]) {
      expect(
        failedPaths(adminAddCourseToSchemaSchema, { ...valid, timeStart: t }),
      ).toContain("timeStart");
    }
    expect(
      adminAddCourseToSchemaSchema.safeParse({
        ...valid,
        timeStart: "00:00",
        timeEnd: "23:59",
      }).success,
    ).toBe(true);
  });

  it("kräver att sluttiden är efter starttiden", () => {
    expect(
      failedPaths(adminAddCourseToSchemaSchema, { ...valid, timeEnd: "17:00" }),
    ).toContain("timeEnd");
    expect(
      failedPaths(adminAddCourseToSchemaSchema, { ...valid, timeEnd: "16:59" }),
    ).toContain("timeEnd");
  });

  it("kräver en riktig veckodag", () => {
    expect(
      failedPaths(adminAddCourseToSchemaSchema, { ...valid, day: "FUNDAY" }),
    ).toContain("day");
  });

  it("kräver att slutdatum inte ligger före startdatum", () => {
    expect(
      adminAddCourseToSchemaSchema.safeParse({
        ...valid,
        customStartDate: "2026-09-01",
        customEndDate: "2026-09-01",
      }).success,
    ).toBe(true);
    expect(
      failedPaths(adminAddCourseToSchemaSchema, {
        ...valid,
        customStartDate: "2026-09-02",
        customEndDate: "2026-09-01",
      }),
    ).toContain("customEndDate");
    expect(
      failedPaths(adminAddCourseToSchemaSchema, {
        ...valid,
        customStartDate: "2026-9-1",
      }),
    ).toContain("customStartDate");
  });
});

describe("adminAddTerminSchema", () => {
  it("kräver att terminen slutar efter att den börjar", () => {
    expect(
      adminAddTerminSchema.safeParse({
        name: "HT",
        startDate: "2026-08-20",
        endDate: "2026-12-20",
      }).success,
    ).toBe(true);
    expect(
      failedPaths(adminAddTerminSchema, {
        name: "HT",
        startDate: "2026-08-20",
        endDate: "2026-08-20",
      }),
    ).toContain("endDate");
  });
});

describe("adminBulkCancelLessonsSchema", () => {
  const valid = {
    from: "2026-10-01",
    to: "2026-10-07",
    courseIds: ["c1"],
    message: "Höstlov",
    cancelled: true,
  };

  it("godtar en giltig massinställning, även en enda dag", () => {
    expect(adminBulkCancelLessonsSchema.safeParse(valid).success).toBe(true);
    expect(
      adminBulkCancelLessonsSchema.safeParse({ ...valid, to: valid.from })
        .success,
    ).toBe(true);
  });

  it("kräver minst en kurs, en anledning och ett riktigt intervall", () => {
    expect(
      failedPaths(adminBulkCancelLessonsSchema, { ...valid, courseIds: [] }),
    ).toContain("courseIds");
    expect(
      failedPaths(adminBulkCancelLessonsSchema, { ...valid, message: "   " }),
    ).toContain("message");
    expect(
      failedPaths(adminBulkCancelLessonsSchema, { ...valid, to: "2026-09-30" }),
    ).toContain("to");
    expect(
      failedPaths(adminBulkCancelLessonsSchema, { ...valid, cancelled: false }),
    ).toContain("cancelled");
  });
});

describe("adminProductSchema", () => {
  const valid = {
    name: "Terminskort",
    description: "",
    unlimitedCustomers: true,
    maxCustomers: 0,
    price: 1500,
    clipcard: false,
    clipCount: 0,
    autobook: false,
    maxCourses: null,
  };

  it("godtar en giltig produkt", () => {
    expect(adminProductSchema.safeParse(valid).success).toBe(true);
  });

  it("kräver minst ett klipp för klippkort", () => {
    expect(
      failedPaths(adminProductSchema, {
        ...valid,
        clipcard: true,
        clipCount: 0,
      }),
    ).toContain("clipCount");
    expect(
      adminProductSchema.safeParse({ ...valid, clipcard: true, clipCount: 10 })
        .success,
    ).toBe(true);
  });

  it("kräver maxantal kunder när antalet inte är obegränsat", () => {
    expect(
      failedPaths(adminProductSchema, {
        ...valid,
        unlimitedCustomers: false,
        maxCustomers: 0,
      }),
    ).toContain("maxCustomers");
  });

  it("avvisar negativa och decimala priser", () => {
    expect(failedPaths(adminProductSchema, { ...valid, price: -1 })).toContain(
      "price",
    );
    expect(
      failedPaths(adminProductSchema, { ...valid, price: 99.5 }),
    ).toContain("price");
  });

  it("maxCourses är null eller minst 1", () => {
    expect(
      adminProductSchema.safeParse({ ...valid, maxCourses: 2 }).success,
    ).toBe(true);
    expect(
      failedPaths(adminProductSchema, { ...valid, maxCourses: 0 }),
    ).toContain("maxCourses");
  });
});

describe("övriga adminscheman", () => {
  it("galleriets sorteringsordning är ett icke-negativt heltal", () => {
    const valid = {
      type: "IMAGE",
      title: "Bild",
      url: "https://x/y.jpg",
      displayOrder: 0,
      active: true,
    };
    expect(adminGalleryItemSchema.safeParse(valid).success).toBe(true);
    expect(
      failedPaths(adminGalleryItemSchema, { ...valid, displayOrder: -1 }),
    ).toContain("displayOrder");
    expect(
      failedPaths(adminGalleryItemSchema, { ...valid, displayOrder: 1.5 }),
    ).toContain("displayOrder");
    expect(
      failedPaths(adminGalleryItemSchema, { ...valid, type: "AUDIO" }),
    ).toContain("type");
  });

  it("en studio kräver engelskt namn", () => {
    expect(
      failedPaths(adminStudioSchema, {
        name: "Sal 1",
        name_en: "",
        description: "Stor",
      }),
    ).toContain("name_en");
  });
});

describe("SignUpFormSchema", () => {
  const valid = {
    firstName: "Anna",
    lastName: "Svensson",
    email: "anna@example.com",
    password: "Hemligt1",
    confirmPassword: "Hemligt1",
    phoneNumber: "0701234567",
    address: "Gatan 1",
    postalCode: "60222",
    city: "Norrköping",
    dateOfBirth: "1990-01-01",
    allowPhotoVideo: false,
  };

  it("godtar en giltig registrering", () => {
    expect(SignUpFormSchema.safeParse(valid).success).toBe(true);
  });

  it("kräver stor bokstav, liten bokstav, siffra och 8 tecken", () => {
    for (const pw of ["hemligt1", "HEMLIGT1", "Hemligtt", "Hem1"]) {
      expect(
        failedPaths(SignUpFormSchema, {
          ...valid,
          password: pw,
          confirmPassword: pw,
        }),
      ).toContain("password");
    }
  });

  it("kräver att lösenorden matchar", () => {
    expect(
      failedPaths(SignUpFormSchema, { ...valid, confirmPassword: "Hemligt2" }),
    ).toContain("confirmPassword");
  });

  it("kräver giltig e-post och ÅÅÅÅ-MM-DD", () => {
    expect(
      failedPaths(SignUpFormSchema, { ...valid, email: "inte-epost" }),
    ).toContain("email");
    expect(
      failedPaths(SignUpFormSchema, { ...valid, dateOfBirth: "1990-1-1" }),
    ).toContain("dateOfBirth");
  });

  it("inloggning kräver e-post och lösenord", () => {
    expect(
      SignInFormSchema.safeParse({ email: "a@b.se", password: "123456" })
        .success,
    ).toBe(true);
    expect(
      failedPaths(SignInFormSchema, { email: "a@b.se", password: "12345" }),
    ).toContain("password");
  });
});

describe("UserPasswordSchema", () => {
  it("kräver att nytt lösenord och bekräftelse matchar", () => {
    const base = { oldPassword: "Gammalt1", password: "Nyttlos1" };
    expect(
      UserPasswordSchema.safeParse({ ...base, confirmPassword: "Nyttlos1" })
        .success,
    ).toBe(true);
    expect(
      failedPaths(UserPasswordSchema, { ...base, confirmPassword: "Annat1Aa" }),
    ).toContain("confirmPassword");
  });
});

describe("UserDetailsSchema", () => {
  const valid = {
    firstName: " Anna ",
    lastName: "Svensson",
    phoneNumber: "",
    address: "",
    postalCode: "",
    city: "",
    dateOfBirth: "1990-01-01",
    bio: "",
    allowPhotoVideo: true,
  };

  it("godtar tomma frivilliga fält och trimmar namn", () => {
    const result = UserDetailsSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data?.firstName).toBe("Anna");
  });

  it("avvisar för korta uppgifter som inte är tomma", () => {
    expect(
      failedPaths(UserDetailsSchema, { ...valid, phoneNumber: "123" }),
    ).toContain("phoneNumber");
    expect(
      failedPaths(UserDetailsSchema, { ...valid, postalCode: "123" }),
    ).toContain("postalCode");
    expect(
      failedPaths(UserDetailsSchema, { ...valid, bio: "x".repeat(501) }),
    ).toContain("bio");
  });
});

describe("ParticipantSchema", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-09T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const valid = {
    name: "Lilla Kalle",
    dateOfBirth: "2015-03-03",
    allowPhotoVideo: false,
  };

  it("godtar en giltig deltagare med eller utan e-post", () => {
    expect(ParticipantSchema.safeParse(valid).success).toBe(true);
    expect(ParticipantSchema.safeParse({ ...valid, email: "" }).success).toBe(
      true,
    );
    expect(
      failedPaths(ParticipantSchema, { ...valid, email: "inte-epost" }),
    ).toContain("email");
  });

  it("kräver minst två tecken namn efter trimning", () => {
    expect(failedPaths(ParticipantSchema, { ...valid, name: " K " })).toContain(
      "name",
    );
  });

  it("avvisar födelsedatum i framtiden", () => {
    expect(
      failedPaths(ParticipantSchema, { ...valid, dateOfBirth: "2026-10-10" }),
    ).toContain("dateOfBirth");
    expect(
      ParticipantSchema.safeParse({ ...valid, dateOfBirth: "2026-10-09" })
        .success,
    ).toBe(true);
  });

  it("godtar ett barn fött idag, även strax efter midnatt svensk tid", () => {
    // 00:30 den 10 oktober i Sverige är fortfarande den 9:e i UTC.
    vi.setSystemTime(new Date("2026-10-09T22:30:00Z"));
    expect(
      ParticipantSchema.safeParse({ ...valid, dateOfBirth: "2026-10-10" })
        .success,
    ).toBe(true);
    vi.setSystemTime(new Date("2026-10-09T12:00:00Z"));
  });

  it("avvisar födelsedatum före 1900", () => {
    expect(
      failedPaths(ParticipantSchema, { ...valid, dateOfBirth: "1899-12-31" }),
    ).toContain("dateOfBirth");
    expect(
      ParticipantSchema.safeParse({ ...valid, dateOfBirth: "1900-01-01" })
        .success,
    ).toBe(true);
  });

  it("kräver ett födelsedatum i formatet ÅÅÅÅ-MM-DD", () => {
    for (const dob of ["", "2015-02-30", "03/03/2015"]) {
      expect(
        failedPaths(ParticipantSchema, { ...valid, dateOfBirth: dob }),
      ).toContain("dateOfBirth");
    }
  });
});

describe("InvoiceRecipientSchema", () => {
  const valid = {
    kind: "self",
    invoiceEmail: "faktura@example.com",
    invoicePhone: "",
    adultConfirmed: false,
  };

  it("godtar tom telefon eller minst fem tecken efter trimning", () => {
    expect(InvoiceRecipientSchema.safeParse(valid).success).toBe(true);
    expect(
      InvoiceRecipientSchema.safeParse({ ...valid, invoicePhone: "   " })
        .success,
    ).toBe(true);
    expect(
      InvoiceRecipientSchema.safeParse({ ...valid, invoicePhone: " 12345 " })
        .success,
    ).toBe(true);
    expect(
      failedPaths(InvoiceRecipientSchema, { ...valid, invoicePhone: "1234" }),
    ).toContain("invoicePhone");
  });

  it("kräver giltig e-post och känt mottagarslag", () => {
    expect(
      failedPaths(InvoiceRecipientSchema, { ...valid, invoiceEmail: "" }),
    ).toContain("invoiceEmail");
    expect(
      failedPaths(InvoiceRecipientSchema, { ...valid, kind: "admin" }),
    ).toContain("kind");
  });

  it("begränsar längden på fritexten", () => {
    expect(
      failedPaths(InvoiceRecipientSchema, {
        ...valid,
        kind: "other",
        invoiceName: "x".repeat(151),
      }),
    ).toContain("invoiceName");
    expect(
      failedPaths(InvoiceRecipientSchema, {
        ...valid,
        participantId: "x".repeat(65),
      }),
    ).toContain("participantId");
  });
});
