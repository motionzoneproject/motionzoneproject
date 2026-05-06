import z from "zod";

import { Weekday } from "@/generated/prisma/enums";

export const adminGalleryItemSchema = z.object({
  type: z.enum(["IMAGE", "VIDEO"]),
  title2: z.string(),
  title: z.string().min(1, "Titel måste anges."),
  url: z.string().min(1, "Mediafil krävs."),
  thumbnailUrl: z.string().optional(),
  description2: z.string(),
  description: z.string().optional(),
  eventId: z.string().optional(),
  displayOrder: z
    .number()
    .int("Sorteringsordning måste vara ett heltal.")
    .nonnegative("Sorteringsordning får inte vara negativ."),
  active: z.boolean(),
  // Derived server-side at upload time; optional on the form
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const TIME_REGEX = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;

// fix: max-booking per tillfälle (t.ex om de har ett tillfälle i studio-1 och ett annat i studio-2 eller bara vill kunna ha olika per dag.)
export const adminAddCourseToSchemaSchema = z
  .object({
    courseId: z.string().min(1),

    place: z.string().optional(),

    timeStart: z.string().min(1).regex(TIME_REGEX, "HH:MM."),

    timeEnd: z.string().min(1).regex(TIME_REGEX, "HH:MM."),

    customStartDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ange datum i formatet ÅÅÅÅ-MM-DD.")
      .optional(),
    customEndDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ange datum i formatet ÅÅÅÅ-MM-DD.")
      .optional(),

    day: z.enum(Object.values(Weekday) as [string, ...string[]]),
  })
  .refine(
    (data) => {
      // Nu är både data.timeEnd och data.timeStart Date-objekt och kan jämföras.
      return data.timeEnd > data.timeStart;
    },
    {
      message: "Sluttiden måste infalla efter starttiden.",
      path: ["timeEnd"],
    },
  )
  .refine(
    (data) => {
      if (!data.customEndDate || !data.customStartDate) return true;
      return new Date(data.customEndDate) >= new Date(data.customStartDate);
    },
    {
      message: "Slutdatumet måste vara samma eller senare än start datumet.",
      path: ["customEndDate"],
    },
  );

export const adminEventSchema = z.object({
  headline: z.string().min(1, "Namn måste anges."),
  headline2: z.string(),
  description: z.string().min(1, "Beskrivning måste anges."),
  description2: z.string(),
  link: z.string().optional(),
  imageURL: z.string().optional(),
  showOnStartpage: z.boolean(),
  startDate: z.coerce.date("Ogiltigt datum"),
  endDate: z.coerce.date("Ogiltigt datum").optional(),
});

export const adminEditEventSchema = z.object({
  id: z.string().min(1),
  headline: z.string().min(1, "Namn måste anges."),
  headline2: z.string(),
  description: z.string().min(1, "Beskrivning måste anges."),
  description2: z.string(),
  link: z.string().optional(),
  imageURL: z.string().optional(),
  showOnStartpage: z.boolean(),
  startDate: z.coerce.date("Ogiltigt datum"),
  endDate: z.coerce.date("Ogiltigt datum").optional(),
});

export const adminAddTerminSchema = z
  .object({
    name: z.string().min(1, "Namn måste anges."),

    startDate: z.coerce.date("Ogiltigt datum"),

    endDate: z.coerce.date("Ogiltigt datum"),
  })

  .refine((data) => data.endDate > data.startDate, {
    message: "Slutdatum måste vara efter startdatum.",
    path: ["endDate"],
  });

export const adminAddCourseSchema = z.object({
  name: z.string().min(3),
  name2: z.string().min(3),
  // maxbookings: z.coerce
  //   .number()
  //   .int("Antal bokningar måste vara ett heltal.")
  //   .nonnegative("Antal platser måste vara noll eller ett positivt tal."),
  // maxCustomers: z.coerce
  //   .number()
  //   .int("Antal platser måste vara ett heltal.")
  //   .nonnegative("Antal platser måste vara noll eller ett positivt tal."),
  description: z.string(),
  description2: z.string(),
  level: z.string().optional(),
  level2: z.string().optional(),
  minAge: z.coerce
    .number()
    .int("Ålder måste vara ett heltal.")
    .nonnegative("Ålder måste vara noll eller ett positivt tal."),
  maxAge: z.coerce
    .number()
    .int("Ålder måste vara ett heltal.")
    .nonnegative("Ålder måste vara noll eller ett positivt tal."),
  adult: z.coerce.boolean().optional(),
  teacherid: z.string().min(1),
});

export const adminLessonFormSchema = z.object({
  id: z.string().min(1),
  message: z.string().optional(),
  cancelled: z.coerce.boolean().optional(),
});

export const adminBulkCancelLessonsSchema = z
  .object({
    from: z.coerce.date("Ogiltigt startdatum"),
    to: z.coerce.date("Ogiltigt slutdatum"),
    courseIds: z.array(z.string().min(1)).min(1, "Valj minst en kurs."),
    message: z.string().trim().min(1, "Anledning maste anges."),
    cancelled: z.literal(true),
  })
  .refine((data) => data.to >= data.from, {
    message: "Slutdatum maste vara samma eller senare an startdatum.",
    path: ["to"],
  });

export const adminProductSchema = z
  .object({
    name: z.string().min(1),
    description: z.string(),
    imageURL: z.string().optional(),
    unlimitedCustomers: z.coerce.boolean().optional(),
    maxCustomers: z.coerce.number().int().nonnegative(),
    price: z.coerce
      .number()
      .int("Priset måste vara ett heltal i SEK")
      .nonnegative("Priset får inte vara negativt"),
    clipcard: z.coerce.boolean().optional(), //Det riktig engelska ordet är clipboard, men jag gillade det inte.
    clipCount: z.coerce.number().int().nonnegative(),
  })
  .superRefine((data, ctx) => {
    if (data.clipcard && data.clipCount < 1) {
      ctx.addIssue({
        code: "custom",
        message: "Antal tillfällen måste vara minst 1 för klippkort.",
        path: ["clipCount"],
      });
    }
    if (!data.unlimitedCustomers && data.maxCustomers < 1) {
      ctx.addIssue({
        code: "custom",
        message: "Max kunder måste vara minst 1 om obegränsat inte är valt.",
        path: ["maxCustomers"],
      });
    }
  });

export const AdminProductCourseItemSchema = z.object({
  productId: z.string().min(1),
  isClipcard: z.coerce.boolean().optional(), // Denna logik kanske kan göras i koden, vi får se.
  courseId: z.string().min(1, "Kurs-ID måste anges."),
  unlimited: z.coerce.boolean().optional(),
  lessonsIncluded: z.coerce
    .number()
    .int()
    .nonnegative("Antalet tillfällen får inte vara negativt."),
});

export const AddStudentToLessonForm = z.object({
  lessonId: z.string().min(1),
  userId: z.string().min(1),
  purchaseItemId: z.string().min(1),
});

export const AdminAddUserInLessonSchema = z.object({
  userId: z.string().min(1),
  purchaseItemId: z.string().min(1),
  lessonId: z.string().min(1),
});

export const adminTeacherSchema = z.object({
  userId: z.string().min(1),
  id: z.string().optional(), // Optional for creation, required for updates (but we usually handle id separately)
  name: z.string().min(1, "Namn måste anges."),
  specialty: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().nullish(),
  active: z.boolean().optional(),
});

export const adminStudioSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Namn måste anges."),
  description: z.string().min(1, "Beskrivning måste anges."),
  imageUrl: z.string().nullish(),
  active: z.boolean().optional(),
});

export const adminStyleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Namn måste anges."),
  description: z.string().min(1, "Beskrivning måste anges."),
  imageUrl: z.string().nullish(),
  active: z.boolean().optional(),
});

export const adminLegalPageSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1, "Titel måste anges."),
  content: z.string().min(1, "Innehåll måste anges."),
});

export const adminStartPageSchema = z.object({
  // Hero
  heroImage: z.string().min(1, "Bild måste anges."),
  heroLabel: z.string().min(1, "Etikett måste anges."),
  heroTitleLine1: z.string().min(1, "Rubrik rad 1 måste anges."),
  heroTitleAccent: z.string().min(1, "Accenttext måste anges."),
  heroTitleLine2: z.string().min(1, "Rubrik rad 2 måste anges."),
  heroSubtext: z.string().min(1, "Brödtext måste anges."),
  // Features header
  featuresTitle: z.string().min(1, "Titel måste anges."),
  featuresSubtext: z.string().min(1, "Underrubrik måste anges."),
  // Feature cards
  feature1Image: z.string().min(1, "Bild måste anges."),
  feature1Title: z.string().min(1, "Titel måste anges."),
  feature1Description: z.string().min(1, "Beskrivning måste anges."),
  feature2Image: z.string().min(1, "Bild måste anges."),
  feature2Title: z.string().min(1, "Titel måste anges."),
  feature2Description: z.string().min(1, "Beskrivning måste anges."),
  feature3Image: z.string().min(1, "Bild måste anges."),
  feature3Title: z.string().min(1, "Titel måste anges."),
  feature3Description: z.string().min(1, "Beskrivning måste anges."),
});
