import z from "zod";

import { Weekday } from "@/generated/prisma/enums";

const TIME_REGEX = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;

// fix: max-booking per tillfälle (t.ex om de har ett tillfälle i studio-1 och ett annat i studio-2 eller bara vill kunna ha olika per dag.)
export const adminAddCourseToSchemaSchema = z
  .object({
    courseId: z.string().min(1),

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
    .int("Antal platser måste vara ett heltal.")
    .nonnegative("Antal platser måste vara noll eller ett positivt tal."),
  // ------------------------------
  description: z.string(),
  teacherid: z.string().min(1),
});

export const adminHandleLessonSchema = z.object({
  id: z.string().min(1),
  message: z.string(),
  cancelled: z.string(),
});
