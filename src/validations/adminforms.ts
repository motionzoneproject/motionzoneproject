import z from "zod";

import { Weekday } from "@/generated/prisma/enums";

export const adminGalleryItemSchema = z.object({
  type: z.enum(["IMAGE", "VIDEO"]),
  title_en: z.string().optional(),
  title: z.string().min(1, "Titel måste anges."),
  url: z.string().min(1, "Mediafil krävs."),
  thumbnailUrl: z.string().optional(),
  description_en: z.string().optional(),
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

export const adminAddCourseToSchemaSchema = z
  .object({
    courseId: z.string().min(1),

    studio: z.string().optional(),
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
  headline_en: z.string().optional(),
  description: z.string().min(1, "Beskrivning måste anges."),
  description_en: z.string().optional(),
  link: z.string().optional(),
  imageURL: z.string().optional(),
  showOnStartpage: z.boolean(),
  startDate: z.string().min(1, "Startdatum måste anges."), // Ändrad till string
  endDate: z.string().optional(),
});

export const adminEditEventSchema = z.object({
  id: z.string().min(1),
  headline: z.string().min(1, "Namn måste anges."),
  headline_en: z.string().optional(),
  description: z.string().min(1, "Beskrivning måste anges."),
  description_en: z.string().optional(),
  link: z.string().optional(),
  imageURL: z.string().optional(),
  showOnStartpage: z.boolean(),
  startDate: z.string().min(1, "Startdatum måste anges."), // Ändrad till string
  endDate: z.string().optional(),
});

export const adminAddTerminSchema = z
  .object({
    name: z.string().min(1, "Namn måste anges."),
    name_en: z.string().optional(),

    startDate: z.string().min(1, "Startdatum måste anges."), // Ändrad till string
    endDate: z.string().min(1, "Slutdatum måste anges."),
  })

  .refine((data) => data.endDate > data.startDate, {
    message: "Slutdatum måste vara efter startdatum.",
    path: ["endDate"],
  });

export const adminAddCourseSchema = z.object({
  name: z.string().min(3),
  name_en: z.string().optional(),
  // maxbookings: z.coerce
  //   .number()
  //   .int("Antal bokningar måste vara ett heltal.")
  //   .nonnegative("Antal platser måste vara noll eller ett positivt tal."),
  // maxCustomers: z.coerce
  //   .number()
  //   .int("Antal platser måste vara ett heltal.")
  //   .nonnegative("Antal platser måste vara noll eller ett positivt tal."),
  description: z.string(),
  description_en: z.string().optional(),
  level: z.string().optional(),
  level_en: z.string().optional(),
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
  style: z.string().optional(),
});

export const adminLessonFormSchema = z.object({
  id: z.string().min(1),
  message: z.string().optional(),
  message_en: z.string().optional(),
  cancelled: z.coerce.boolean().optional(),
});

export const adminBulkCancelLessonsSchema = z
  .object({
    from: z.string().min(1),
    to: z.string().min(1),
    courseIds: z.array(z.string().min(1)).min(1, "Valj minst en kurs."),
    message: z.string().trim().min(1, "Anledning maste anges."),
    message_en: z.string().optional(),
    cancelled: z.literal(true),
  })
  .refine((data) => data.to >= data.from, {
    message: "Slutdatum maste vara samma eller senare an startdatum.",
    path: ["to"],
  });

export const adminCategorySchema = z.object({
  name: z.string().min(1, "Namn måste anges."),
  name_en: z.string().optional(),
});

export const adminProductSchema = z
  .object({
    name: z.string().min(1),
    name_en: z.string().optional(),
    description: z.string(),
    description_en: z.string().optional(),
    imageURL: z.string().optional(),
    unlimitedCustomers: z.coerce.boolean().optional(),
    categoryId: z.string().optional(), // NYTT
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
  specialty_en: z.string().optional(),
  description: z.string().optional(),
  description_en: z.string().optional(),
  imageUrl: z.string().nullish(),
  active: z.boolean().optional(),
});

export const adminStudioSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Namn måste anges."),
  name_en: z.string().min(1, "Namn måste anges."),
  description: z.string().min(1, "Beskrivning måste anges."),
  description_en: z.string().optional(),
  imageUrl: z.string().nullish(),
  active: z.boolean().optional(),
});

export const adminStyleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Namn måste anges."),
  name_en: z.string().optional(),
  description: z.string().min(1, "Beskrivning måste anges."),
  description_en: z.string().optional(),
  imageUrl: z.string().nullish(),
  active: z.boolean().optional(),
});

export const adminLegalPageSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1, "Titel måste anges."),
  title_en: z.string().optional(),
  content: z.string().min(1, "Innehåll måste anges."),
  content_en: z.string().optional(),
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

  // en:

  heroLabel_en: z.string().min(1, "Etikett måste anges."),
  heroTitleLine1_en: z.string().min(1, "Rubrik rad 1 måste anges."),
  heroTitleAccent_en: z.string().min(1, "Accenttext måste anges."),
  heroTitleLine2_en: z.string().min(1, "Rubrik rad 2 måste anges."),
  heroSubtext_en: z.string().min(1, "Brödtext måste anges."),
  // Features header
  featuresTitle_en: z.string().min(1, "Titel måste anges."),
  featuresSubtext_en: z.string().min(1, "Underrubrik måste anges."),
  // Feature card
  feature1Title_en: z.string().min(1, "Titel måste anges."),
  feature1Description_en: z.string().min(1, "Beskrivning måste anges."),
  feature2Title_en: z.string().min(1, "Titel måste anges."),
  feature2Description_en: z.string().min(1, "Beskrivning måste anges."),
  feature3Title_en: z.string().min(1, "Titel måste anges."),
  feature3Description_en: z.string().min(1, "Beskrivning måste anges."),

  // Image section (NYTT)
  image1: z.string().optional(),
  image2: z.string().optional(),
  image3: z.string().optional(),
});
