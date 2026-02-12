import z from "zod";

import { Weekday } from "@/generated/prisma/enums";

const TIME_REGEX = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;

// fix: max-booking per tillfälle (t.ex om de har ett tillfälle i studio-1 och ett annat i studio-2 eller bara vill kunna ha olika per dag.)
export const adminAddCourseToSchemaSchema = z
  .object({
    courseId: z.string().min(1),

    place: z.string().optional(),

    timeStart: z.string().min(1).regex(TIME_REGEX, "HH:MM."),

    timeEnd: z.string().min(1).regex(TIME_REGEX, "HH:MM."),

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
  );

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
  maxbookings: z.coerce
    .number()
    .int("Antal bokningar måste vara ett heltal.")
    .nonnegative("Antal platser måste vara noll eller ett positivt tal."),
  maxCustomers: z.coerce
    .number()
    .int("Antal platser måste vara ett heltal.")
    .nonnegative("Antal platser måste vara noll eller ett positivt tal."),
  description: z.string(),
  level: z.string().optional(),
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

export const adminProductSchema = z
  .object({
    name: z.string().min(1),
    description: z.string(),
    imageURL: z.string().optional(),
    unlimitedCustomers: z.coerce.boolean().optional(),
    maxCustomers: z.coerce.number().int().nonnegative(),
    price: z.coerce.number().nonnegative("Priset får inte vara negativt"),
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

export const AdminAddUserInLessonSchema = z.object({
  userId: z.string().min(1),
  purchaseItemId: z.string().min(1),
  lessonId: z.string().min(1),
});
