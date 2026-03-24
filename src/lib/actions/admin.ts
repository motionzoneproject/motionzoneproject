"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type z from "zod";
import type {
  Booking,
  Course,
  Lesson,
  Participant,
  Prisma,
  Product,
  ProductType,
  Purchase,
  PurchaseItem,
  SchemaItem,
  Termin,
  User,
  Weekday,
} from "@/generated/prisma/client";
import {
  AddStudentToLessonForm,
  AdminProductCourseItemSchema,
  adminAddCourseSchema,
  adminAddCourseToSchemaSchema,
  adminAddTerminSchema,
  adminBulkCancelLessonsSchema,
  adminEditEventSchema,
  adminEventSchema,
  adminLessonFormSchema,
  adminProductSchema,
} from "@/validations/adminforms";
import { auth } from "../auth";
import { sekToOre } from "../money";
import prisma from "../prisma";
import { formToDbDate } from "../time-convert";
import { getProductStats, handleClips } from "./purchase-actions";
import { calcRemainingCount, hasRemainingCount } from "./purchase-helpers";
import { getSessionData } from "./sessiondata";

/**
 * Check if session user is admin.
 * @returns true/false
 * @auth Admin
 */
export async function isAdminRole(): Promise<boolean> {
  const sessiondata = await getSessionData();

  return sessiondata?.user.role === "admin";
}

/**
 * Get a list of all "terminer" in db.
 * @returns Promise of Terminer as a list of Termin[].
 * @auth Admin
 */
export async function getTerminer(): Promise<Termin[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  const terminer = await prisma.termin.findMany({
    orderBy: { startDate: "asc" },
  });
  return terminer;
}

/**
 * Needed in admin/termin to list all schemaitems, including course for building coursename (see GetCourseName in app/tools).
 *
 */
export type SchemaItemWithCourse = SchemaItem & {
  course: Course;
  Lessons: Lesson[];
};

/**
 * Gets schemaItems (with course) for a specific termin
 * @param terminId The id of the termin.
 * @returns schemaItems (with course) for a specific termin as an array of type SchemaItemWithCourse
 * @auth Admin
 */
export async function getSchemaItems(
  terminId: string,
): Promise<SchemaItemWithCourse[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  const schemaItems = await prisma.schemaItem.findMany({
    where: { terminId },
    include: { course: true, Lessons: true },
  });

  return schemaItems;
}

/**
 * Listing courses, with filter for course name. (Notice that its not searching for the combined name only the db field name)
 * @param q term for course name.
 * @returns the found courses as Course[]
 * @auth Admin
 */
export async function getAllCourses(q: string = ""): Promise<Course[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  const courses = await prisma.course.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    orderBy: { name: "asc" },
  });
  return courses;
}

export async function editNewEvent(
  formData: z.infer<typeof adminEditEventSchema>,
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  const validated = await adminEditEventSchema.parseAsync(formData);

  try {
    const editedEvent = await prisma.event.update({
      where: { id: validated.id },
      data: {
        headline: validated.headline,
        description: validated.description,
        imageURL: validated.imageURL ?? "",
        link: validated.link ?? "",
        startDate: new Date(validated.startDate),
        endDate: validated.endDate ? new Date(validated.endDate) : null,
      },
    });
    revalidatePath("/admin/events");
    return {
      success: true,
      msg: `Event ${editedEvent.headline} uppdaterades.`,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte uppdatera eventet." };
  }
}

export async function addNewEvent(formData: z.infer<typeof adminEventSchema>) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    // Validate terminSchema.
    const validated = await adminEventSchema.parseAsync(formData);

    const newEvent = await prisma.event.create({
      data: {
        headline: validated.headline,
        description: validated.description,
        imageURL: validated.imageURL ?? "",
        link: validated.link ?? "",
        startDate: new Date(validated.startDate),
        endDate: validated.endDate ? new Date(validated.endDate) : null,
      },
    });
    return {
      success: true,
      msg: `Event ${newEvent.headline} skapades.`,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte skapa eventet." };
  }
}

/**
 * Creates a new "termin".
 * * @param formData - formdata for creating the new termin.
 * @returns An object with success (booleam) and a msg.
 * Returns an error msg if not admin or validation fails.
 * @auth Admin
 */
export async function addNewTermin(
  formData: z.infer<typeof adminAddTerminSchema>,
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    // Validate terminSchema.
    const validated = await adminAddTerminSchema.parseAsync(formData);

    const newSchemaItem = await prisma.termin.create({
      data: {
        name: validated.name,
        startDate: new Date(validated.startDate),
        endDate: new Date(validated.endDate),
      },
    });
    return {
      success: true,
      msg: `Terminen ${newSchemaItem.name} skapades.`,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte skapa terminen." };
  }
}

/**
 * Checks if any lessons are affected if Start/End date changes.
 * @returns Count of affected lessons.
 * @auth Admin
 */
export async function checkTerminDateChange(
  terminId: string,
  newStart: Date,
  newEnd: Date,
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { count: 0 };

  const affectedBookings = await prisma.booking.count({
    where: {
      lesson: {
        terminId: terminId,
        OR: [{ startTime: { lt: newStart } }, { startTime: { gt: newEnd } }],
      },
    },
  });

  return { count: affectedBookings };
}

/**
 Updates a "termin".
 * @returns An object with success (boolean) and a msg.
 * @auth Admin
 */
export async function editTermin(
  id: string,
  formData: z.infer<typeof adminAddTerminSchema>,
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminAddTerminSchema.parseAsync(formData);
    const newStartDate = new Date(validated.startDate);
    const newEndDate = new Date(validated.endDate);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Hämta nuvarande termin (för att avgöra "följ termin")
      const currentTermin = await tx.termin.findUnique({ where: { id } });
      if (!currentTermin) throw new Error("No termin.");

      // 2. Uppdatera själva terminen
      const updatedTermin = await tx.termin.update({
        where: { id },
        data: {
          name: validated.name,
          startDate: newStartDate,
          endDate: newEndDate,
        },
      });

      // 2. Hämta alla schemaItems för att synka lektioner
      const schemaItems = await tx.schemaItem.findMany({
        where: { terminId: id },
        include: {
          course: true,
          Lessons: true,
        },
      });

      const sameDayUtc = (a: Date, b: Date) =>
        a.getUTCFullYear() === b.getUTCFullYear() &&
        a.getUTCMonth() === b.getUTCMonth() &&
        a.getUTCDate() === b.getUTCDate();

      // 4. Hantera bokningar och lektioner som hamnar utanför de nya tidsramarna
      for (const item of schemaItems) {
        // Kollar om schemaItem följer terminens datum:
        const followsStart =
          !item.customStartDate ||
          sameDayUtc(item.customStartDate, currentTermin.startDate);
        const followsEnd =
          !item.customEndDate ||
          sameDayUtc(item.customEndDate, currentTermin.endDate);

        // Beroende på det så ska vi bygga nya lektioner (eller ta bort). Om custom så kommer det bli orört
        // (eftersom vi hämtar less than validStart och greater than validEnd)...
        const validStart = followsStart
          ? newStartDate
          : (item.customStartDate ?? newStartDate);
        const validEnd = followsEnd
          ? newEndDate
          : (item.customEndDate ?? newEndDate);

        // Hämta de boknignar som ev berörs:
        const affectedBookings = await tx.booking.findMany({
          where: {
            lesson: {
              schemaItemId: item.id,
              OR: [
                { startTime: { lt: validStart } },
                { startTime: { gt: validEnd } },
              ],
            },
          },
          select: { id: true, purchaseItemId: true },
        });

        for (const booking of affectedBookings) {
          if (!booking.purchaseItemId) continue; // Ska visserligen alltid finnas...

          const clipResult = await handleClips(tx, booking.purchaseItemId, 1);
          if (!clipResult.success) {
            throw new Error(clipResult.msg || "Clip update failed.");
          }
        }

        // Städa bort lektioner utanför intervallet:
        await tx.lesson.deleteMany({
          where: {
            schemaItemId: item.id,
            OR: [
              { startTime: { lt: validStart } },
              { startTime: { gt: validEnd } },
            ],
          },
        });
      }

      // 5. Skapa nya lektioner för de datum som ev tillkommit ()
      const WEEKDAY_MAP: Record<string, number> = {
        MONDAY: 1,
        TUESDAY: 2,
        WEDNESDAY: 3,
        THURSDAY: 4,
        FRIDAY: 5,
        SATURDAY: 6,
        SUNDAY: 0,
      };

      const lessonsToCreate = [];

      for (const item of schemaItems) {
        const targetDay = WEEKDAY_MAP[item.weekday];
        const followsStart =
          !item.customStartDate ||
          sameDayUtc(item.customStartDate, currentTermin.startDate);
        const followsEnd =
          !item.customEndDate ||
          sameDayUtc(item.customEndDate, currentTermin.endDate);

        const actualStart = followsStart
          ? newStartDate
          : (item.customStartDate ?? newStartDate);
        const actualEnd = followsEnd
          ? newEndDate
          : (item.customEndDate ?? newEndDate);
        const currentDate = new Date(actualStart.getTime());

        const startHours = item.timeStart.getHours();
        const startMinutes = item.timeStart.getMinutes();
        const endHours = item.timeEnd.getHours();
        const endMinutes = item.timeEnd.getMinutes();

        while (currentDate <= actualEnd) {
          currentDate.setHours(0, 0, 0, 0);

          if (currentDate.getDay() === targetDay) {
            const combinedStartTime = new Date(currentDate.getTime());
            combinedStartTime.setHours(startHours, startMinutes, 0, 0);

            // Kolla om lektionen redan finns (så vi inte skapar dubbletter)
            const exists = item.Lessons.some(
              (l) => l.startTime.getTime() === combinedStartTime.getTime(),
            );

            if (!exists) {
              const combinedEndTime = new Date(currentDate.getTime());
              combinedEndTime.setHours(endHours, endMinutes, 0, 0);

              lessonsToCreate.push({
                startTime: combinedStartTime,
                endTime: combinedEndTime,
                terminId: id,
                courseId: item.courseId,
                teacherId: item.course.teacherId,
                schemaItemId: item.id,
              });
            }
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      if (lessonsToCreate.length > 0) {
        await tx.lesson.createMany({
          data: lessonsToCreate,
        });
      }

      return updatedTermin;
    });

    revalidatePath("/admin/courses");

    return {
      success: true,
      msg: `Terminen "${result.name}" har uppdaterats. Eventuella bokningar utanför perioden har raderats och bokningar har återställts till eleverna.`,
    };
  } catch (e) {
    console.error("Fel vid editTermin:", e);
    const msg =
      e instanceof Error ? e.message : "Ett fel uppstod vid uppdatering.";
    return { success: false, msg };
  }
}

/**
  Creating schemaitems and lessons when adding a course to a termin week schema.
 * @auth Admin
 */
export async function addCoursetoSchema(
  terminId: string,
  formData: z.infer<typeof adminAddCourseToSchemaSchema>,
): Promise<{
  success: boolean;
  msg: string;
}> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminAddCourseToSchemaSchema.parseAsync(formData);

    const getCourse = await prisma.course.findUnique({
      where: { id: validated.courseId },
    });

    if (!getCourse) throw new Error("Course was not found.");

    const result = await prisma.$transaction(async (tx) => {
      const termin = await tx.termin.findUnique({ where: { id: terminId } });
      if (!termin) throw new Error("No termin.");

      const finalStartDate = validated.customStartDate
        ? new Date(validated.customStartDate)
        : termin.startDate;
      const finalEndDate = validated.customEndDate
        ? new Date(validated.customEndDate)
        : termin.endDate;

      const newSchemaItem = await tx.schemaItem.create({
        data: {
          terminId,
          place: validated.place,
          courseId: validated.courseId,
          timeStart: formToDbDate(validated.timeStart),
          timeEnd: formToDbDate(validated.timeEnd),
          customStartDate: finalStartDate,
          customEndDate: finalEndDate,
          weekday: validated.day as Weekday,
        },
        include: { course: true, termin: true },
      });

      const lessons = await createLessons(newSchemaItem.id, tx);

      if (!lessons.success) {
        throw new Error(
          "Inga lektioner kunde skapas inom denna termin. Kontrollera startDate och endDate så de täcker bokningsbara dagar.",
        );
      }

      return { newSchemaItem, lessonsMsg: lessons.msg };
    });

    return {
      success: true,
      msg: `Kursen ${result.newSchemaItem.course.name} lades till i terminen ${result.newSchemaItem.termin.name}. ${result.lessonsMsg}`,
    };
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Ett oväntat fel uppstod.";
    return { success: false, msg };
  }
}

/**
  Edit schemaitems and lessons when editing a course in a termin week schema.
 * @auth Admin
 */
export async function editCourseInSchema(
  terminId: string,
  schemaItemId: string,
  formData: z.infer<typeof adminAddCourseToSchemaSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminAddCourseToSchemaSchema.parseAsync(formData);

    const getCourse = await prisma.course.findUnique({
      where: { id: validated.courseId },
    });

    if (!getCourse) throw new Error("Course was not found.");

    const termin = await prisma.termin.findUnique({ where: { id: terminId } });
    if (!termin) throw new Error("No termin.");

    const finalStartDate = validated.customStartDate
      ? new Date(validated.customStartDate)
      : termin.startDate;
    const finalEndDate = validated.customEndDate
      ? new Date(validated.customEndDate)
      : termin.endDate;

    const result = await prisma.$transaction(async (tx) => {
      const updatedSchemaItem = await tx.schemaItem.update({
        where: { id: schemaItemId },
        data: {
          terminId,
          place: validated.place,
          courseId: validated.courseId,
          timeStart: formToDbDate(validated.timeStart),
          timeEnd: formToDbDate(validated.timeEnd),
          customStartDate: finalStartDate,
          customEndDate: finalEndDate,
          weekday: validated.day as Weekday,
        },
        include: { course: true, termin: true },
      });

      await tx.lesson.deleteMany({
        where: { schemaItemId: updatedSchemaItem.id },
      });

      return updatedSchemaItem;
    });

    const lessons = await createLessons(schemaItemId);

    if (!lessons.success) {
      throw new Error(
        "Kunde inte generera nya lektioner. Kontrollera dina datum.",
      );
    }

    revalidatePath("/admin/termin");
    revalidatePath("/admin/courses");

    return {
      success: true,
      msg: `Kursen ${result.course.name} har uppdaterats i ${result.termin.name}. ${lessons.msg}`,
    };
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Ett oväntat fel uppstod.";
    return { success: false, msg };
  }
}

/**
 * Removes schemaItems and lessons (and bookings) when deleting a course from a termin week schema and restoring clips to customers.
 * @returns Success (boolean) and a message.
 * @auth Admin
 */
export async function delSchemaItem(
  id: string,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    // Hämta ev bokningar som är gjorda i kursen.
    const bookings = await prisma.booking.findMany({
      where: {
        lesson: { schemaItemId: id },
        cancelled: false,
      },
      select: {
        id: true,
        purchaseItemId: true,
      },
    });

    // Vi sparar resultatet från transaktionen i en variabel
    const result = await prisma.$transaction(async (tx) => {
      if (bookings.length > 0) {
        for (const booking of bookings) {
          if (!booking.purchaseItemId) continue;

          // Sköts via handleClips:
          const clipResult = await handleClips(tx, booking.purchaseItemId, 1);
          if (!clipResult.success) {
            throw new Error(clipResult.msg || "Clip update failed.");
          }
        }
      }

      const del = await tx.schemaItem.delete({
        where: { id },
        select: { course: { select: { name: true } } },
      });

      return {
        success: true,
        msg: `${del.course.name} och dess bokningar togs bort. ${bookings.length} klipp har återställts.`,
      };
    });

    return result;
  } catch (e) {
    console.error(e);
    return {
      success: false,
      msg: "Ett fel uppstod vid radering av schemaposten.",
    };
  }
}

export async function delEvent(
  eventId: string,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const del = await prisma.event.delete({
      where: { id: eventId },
    });
    return {
      success: true,
      msg: `${del.headline} togs bort.`,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      msg: "Ett fel uppstod vid radering av eventet.",
    };
  }
}

/**
 * Removes an entire termin.
 * @returns Success (boolean) and a message.
 * @auth Admin
 */
export async function delTermin(
  id: string,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    // 1. Hitta alla aktiva bokningar kopplade till denna termin
    const bookings = await prisma.booking.findMany({
      where: {
        lesson: { terminId: id },
        cancelled: false, // Hmm, ska vi verkligen ignorera detta? Kommer ligga onödiga bokningar. Eller just det, ja för annars betalas inställda bokningar tillbaka. Ev. fix för att inte ha onödig data i db.
      },
      select: { purchaseItemId: true },
    });

    // 2. Kör transaktionen
    const result = await prisma.$transaction(async (tx) => {
      // Återställ alla klipp
      if (bookings.length > 0) {
        for (const booking of bookings) {
          if (!booking.purchaseItemId) continue;

          // Via handleClips :)
          const clipResult = await handleClips(tx, booking.purchaseItemId, 1);

          if (!clipResult.success) {
            throw new Error(clipResult.msg || "Clip update failed.");
          }
        }
      }

      // Radera terminen (triggar cascade för resten)
      const deletedTermin = await tx.termin.delete({
        where: { id },
        select: { name: true },
      });

      return deletedTermin.name;
    });

    revalidatePath("/admin/termins");

    return {
      success: true,
      msg: `Terminen ${result} och ${bookings.length} tillhörande bokningar raderades. Klipp har återställts.`,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      msg: "Kunde inte radera terminen. Kontrollera om den har aktiva kopplingar som hindrar radering.",
    };
  }
}

/**
 * Removes a course, all schemaItems, lessons and bookings and restores clips.
 * * @important
 * @returns Success (boolean) and a message.
 * * @auth Admin
 */
export async function delCourse(
  id: string,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    // Hitta aktiva bokningar för denna kurs (för att återställa =))
    const bookings = await prisma.booking.findMany({
      where: {
        lesson: { courseId: id },
        cancelled: false,
      },
      select: { purchaseItemId: true },
    });

    // Kör transaktionen
    const result = await prisma.$transaction(async (tx) => {
      // Återställ klipp för de bokningar som kommer raderas via cascade
      if (bookings.length > 0) {
        for (const booking of bookings) {
          if (!booking.purchaseItemId) continue;

          // Via handleclips:
          const clipResult = await handleClips(tx, booking.purchaseItemId, 1);
          if (!clipResult.success) {
            throw new Error(clipResult.msg || "Clip update failed.");
          }
        }
      }

      // 3. Försök radera kursen (om den finns i produkt så kommer inte transaktionen gå igenom.)
      const deletedCourse = await tx.course.delete({
        where: { id },
        select: { name: true },
      });

      return deletedCourse.name;
    });

    revalidatePath("/admin/courses");

    return {
      success: true,
      msg: `Kursen ${result} raderades. ${bookings.length} bokningar togs bort och klipp återställdes.`,
    };
  } catch (e) {
    console.error(e);

    return {
      success: false,
      msg: "Kunde inte radera kursen.",
    };
  }
}

/**
 * Creates a new course
 * * @returns Ett objekt med success-status och ett bekräftande meddelande med kursens namn.
 * @auth Admin
 */
export async function addNewCourse(
  formData: z.output<typeof adminAddCourseSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminAddCourseSchema.parseAsync(formData);

    const checkTeacherId = await prisma.user.findUnique({
      where: { id: validated.teacherid },
    });

    if (!(checkTeacherId && checkTeacherId.role === "admin"))
      throw new Error(
        `A teacher with id ${validated.teacherid} was not found.`,
      );

    const newCourseItem = await prisma.course.create({
      data: {
        name: validated.name,
        minAge: validated.minAge,
        maxAge: validated.maxAge,
        level: validated.level,
        adult: validated.adult,
        description: validated.description,
        teacherId: validated.teacherid,
      },
    });
    return {
      success: true,
      msg: `Kursen ${newCourseItem.name} skapades.`,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte skapa kursen." };
  }
}

/**
 * Updates the information on a existing course.
 * @returns Success (boolean) and a message.
 * @auth Admin
 */
export async function editCourse(
  id: string,
  formData: z.output<typeof adminAddCourseSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminAddCourseSchema.parseAsync(formData);

    const checkTeacherId = await prisma.user.findUnique({
      where: { id: validated.teacherid },
    });

    if (!(checkTeacherId && checkTeacherId.role === "admin"))
      throw new Error(
        `A teacher with id ${validated.teacherid} was not found.`,
      );

    const newCourseItem = await prisma.course.update({
      data: {
        name: validated.name,
        minAge: validated.minAge,
        maxAge: validated.maxAge,
        level: validated.level,
        adult: validated.adult,
        description: validated.description,
        teacherId: validated.teacherid,
      },
      where: { id: id },
    });
    return {
      success: true,
      msg: `Kursen ${newCourseItem.name} ändrades.`,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte uppdatera kursen." };
  }
}

// *

/**
 * Creating lessons bases on a schemaItem.
 * @returns Success (boolean) and a message.
 */
async function createLessons(
  schemaItemId: string,
  tx?: Prisma.TransactionClient,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    // Hämtar all data vi behöver.

    // Behöver vi validatera någonting här? ev. fix.

    const db = tx ?? prisma;

    const schemaItm = await db.schemaItem.findUnique({
      where: { id: schemaItemId },
      include: { termin: true, course: true },
    });

    if (!schemaItm) throw new Error("schemaItm kunde inte hittas.");

    const WEEKDAY_MAP: Record<Weekday, number> = {
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
      SUNDAY: 0,
    };

    const targetDay = WEEKDAY_MAP[schemaItm?.weekday]; // Få targetday som rätt nummer.

    const startDate = schemaItm.customStartDate ?? schemaItm.termin.startDate;
    const endDate = schemaItm.customEndDate ?? schemaItm.termin.endDate;
    const teacherId = schemaItm.course.teacherId;

    const lessonsToCreate = []; // Dessa lessions ska skapas.

    const currentDate = new Date(startDate.getTime());
    const startHours = schemaItm.timeStart.getHours();
    const startMinutes = schemaItm.timeStart.getMinutes();
    const endHours = schemaItm.timeEnd.getHours();
    const endMinutes = schemaItm.timeEnd.getMinutes();

    /// Så nu loopar vi igenom alla targetdays inom den perioden:

    while (currentDate <= endDate) {
      currentDate.setHours(0, 0, 0, 0);

      // Jämför veckodag (getDay() returnerar 0-6)
      if (currentDate.getDay() === targetDay) {
        // Skapa startTime: Kombinera matchande datum med tidskomponenten
        const combinedStartTime = new Date(currentDate.getTime());
        combinedStartTime.setHours(startHours, startMinutes, 0, 0); // Sätt tid, nollställ sek/ms

        // Skapa endTime: Kombinera matchande datum med tidskomponenten
        const combinedEndTime = new Date(currentDate.getTime());
        combinedEndTime.setHours(endHours, endMinutes, 0, 0);

        lessonsToCreate.push({
          startTime: combinedStartTime,
          endTime: combinedEndTime,
          terminId: schemaItm.termin.id,
          courseId: schemaItm.course.id,
          teacherId: teacherId,
          schemaItemId: schemaItm.id, // Denna kopplar Lesson till mallen
          // message och cancelled får standardvärden/null
        });
      }
      // Gå till nästa dag
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Kontrollera om det finns något att skapa
    if (lessonsToCreate.length === 0) {
      return {
        success: false,
        msg: "No matching days found to create lessons.",
      };
    }

    const result = await db.lesson.createMany({
      data: lessonsToCreate,
      skipDuplicates: true,
    });

    return {
      success: true,
      msg: `Successfully created ${result.count} lessons.`,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte skapa lektioner." };
  }
}

/**
 * Edit a lessonItem and handle clips.
 * @returns Success (boolean) and a message.
 * @auth Admin
 */
export async function editLessonItem(
  formData: z.output<typeof adminLessonFormSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminLessonFormSchema.parseAsync(formData);

    const currentLesson = await prisma.lesson.findUnique({
      where: { id: validated.id },
      include: { bookings: true },
    });

    if (!currentLesson) return { success: false, msg: "Lesson not found." };

    await prisma.$transaction(async (tx) => {
      if (!currentLesson.cancelled && validated.cancelled) {
        for (const booking of currentLesson.bookings) {
          const clipResult = await handleClips(tx, booking.purchaseItemId, 1);
          if (!clipResult.success) {
            throw new Error(clipResult.msg || "Clip update failed.");
          }
        }

        // Ta bort bokningarna när lektionen ställs in.
        await tx.booking.deleteMany({
          where: { lessonId: validated.id },
        });
      }

      // 4. Uppdatera själva lektionen
      await tx.lesson.update({
        where: { id: validated.id },
        data: {
          message: validated.message,
          cancelled: validated.cancelled,
        },
      });
    });

    revalidatePath("/admin/lectures");
    revalidatePath("/admin");

    return {
      success: true,
      msg: "Lektionen, bokningar och klipp-saldon har uppdaterats.",
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Ett fel uppstod vid uppdatering." };
  }
}

/**
 * Bulk update lessons to cancelled state in a date range and selected courses.
 * Restores clips and removes existing bookings for newly cancelled lessons.
 * @auth Admin
 */
export async function bulkCancelLessons(
  formData: z.output<typeof adminBulkCancelLessonsSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminBulkCancelLessonsSchema.parseAsync(formData);
    const from = new Date(validated.from);
    from.setHours(0, 0, 0, 0);

    const to = new Date(validated.to);
    to.setHours(23, 59, 59, 999);

    const lessons = await prisma.lesson.findMany({
      where: {
        startTime: {
          gte: from,
          lte: to,
        },
        courseId: {
          in: validated.courseIds,
        },
      },
      select: {
        id: true,
        cancelled: true,
      },
    });

    if (lessons.length === 0) {
      return {
        success: false,
        msg: "Inga lektioner matchade ditt urval.",
      };
    }

    const lessonIds = lessons.map((lesson) => lesson.id);
    const newlyCancelledLessonIds = lessons
      .filter((lesson) => !lesson.cancelled)
      .map((lesson) => lesson.id);

    await prisma.$transaction(async (tx) => {
      if (newlyCancelledLessonIds.length > 0) {
        const bookings = await tx.booking.findMany({
          where: {
            lessonId: { in: newlyCancelledLessonIds },
          },
          select: {
            id: true,
            purchaseItemId: true,
          },
        });

        for (const booking of bookings) {
          const clipResult = await handleClips(tx, booking.purchaseItemId, 1);
          if (!clipResult.success) {
            throw new Error(clipResult.msg || "Clip update failed.");
          }
        }

        await tx.booking.deleteMany({
          where: {
            lessonId: { in: newlyCancelledLessonIds },
          },
        });
      }

      await tx.lesson.updateMany({
        where: {
          id: { in: lessonIds },
        },
        data: {
          cancelled: validated.cancelled,
          message: validated.message,
        },
      });
    });

    revalidatePath("/admin/lectures");
    revalidatePath("/admin");

    return {
      success: true,
      msg: `${lessonIds.length} lektioner markerades som installda.`,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Ett fel uppstod vid uppdatering." };
  }
}

/**
 * Gets all products in db.
 * @auth Admin
 */
export async function getAllProducts(): Promise<Product[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });

  return products;
}

/**
 * Represents the relation of prodOnCourse.
 * Also contains the full course.
 */
export type ProdCourse = {
  course: Course;
} & {
  courseId: string;
  productId: string;
  lessonsIncluded: number;
  unlimited: boolean;
};

/**
 * Creates a new product.
 * @returns success (boolean) and a msg.
 * @auth Admin
 */
export async function addNewProduct(
  formData: z.output<typeof adminProductSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminProductSchema.parseAsync(formData);
    const unlimitedCustomers = validated.unlimitedCustomers === true;

    const newProd = await prisma.product.create({
      data: {
        name: validated.name,
        description: validated.description,
        price: sekToOre(validated.price),
        maxCustomer: unlimitedCustomers ? 0 : validated.maxCustomers,
        unlimitedCustomers,
        totalCount: validated.clipCount,
        imageURL: validated.imageURL,
      },
    });

    // Uppdatera typen:
    const type = await updateProductType(newProd.id, {
      isClip: validated.clipcard,
    });
    return {
      success: true,
      msg: `Produkten ${newProd.name} av typen ${type} skapades.`, // fix
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte skapa produkten." };
  }
}

/**
 * Edits a product.
 * @returns success (boolean) and a msg.
 * @auth Admin
 */
export async function editProduct(
  id: string,
  formData: z.output<typeof adminProductSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminProductSchema.parseAsync(formData);
    const unlimitedCustomers = validated.unlimitedCustomers === true;
    const maxCustomers = unlimitedCustomers ? 0 : validated.maxCustomers;

    // Kolla så vi inte sänker under redan upptagna platser (sålda + reserverade).
    if (!unlimitedCustomers) {
      const stats = await getProductStats(id);
      if (!stats.success || stats.sold === null || stats.reserved === null) {
        return {
          success: false,
          msg: "Kunde inte verifiera platsstatistik. Försök igen.",
        };
      }

      const usedSpots = stats.sold + stats.reserved;
      if (maxCustomers < usedSpots) {
        return {
          success: false,
          msg: `Kan inte sänka maxantalet under redan upptagna platser (${usedSpots}).`,
        };
      }
    }

    const newProd = await prisma.product.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description,
        price: sekToOre(validated.price),
        maxCustomer: maxCustomers,
        unlimitedCustomers,
        totalCount: validated.clipCount,
        imageURL: validated.imageURL,
      },
    });

    // Uppdatera typen.
    await updateProductType(id, { isClip: validated.clipcard });

    return {
      success: true,
      msg: `Produkten ${newProd.name} ändrades.`, // fix
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte uppdatera produkten." };
  }
}

/**
 * Removes a new product.
 * @returns success (boolean) and a msg.
 * @auth Admin
 */
export async function removeProduct(
  id: string,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const remProd = await prisma.product.delete({
      where: { id },
    });
    return {
      success: true,
      msg: `Produkten ${remProd.name} togs bort.`, // fix
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte ta bort produkten." };
  }
}

/**
 * Adds a course into a product.
 * @returns success (boolean) and a msg.
 * @auth Admin
 */
export async function addCourseToProduct(
  formData: z.output<typeof AdminProductCourseItemSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await AdminProductCourseItemSchema.parseAsync(formData);

    const isInProd = await isCourseInProduct(
      formData.courseId,
      formData.productId,
    );

    if (isInProd) {
      await prisma.$transaction(async (tx) => {
        const productType = await updateProductType(validated.productId, {
          tx,
        });
        await tx.productOnCourse.update({
          where: {
            courseId_productId: {
              courseId: validated.courseId,
              productId: validated.productId,
            },
          },
          data: {
            lessonsIncluded:
              productType === "CLIP" || validated.unlimited
                ? 0
                : validated.lessonsIncluded,
            unlimited: validated.unlimited ?? false,
          },
        });
      });

      return {
        success: true,
        msg: `Kursen ändrades i produkten.`,
      };
    } else {
      await prisma.$transaction(async (tx) => {
        const productType = await updateProductType(validated.productId, {
          tx,
        });
        await tx.productOnCourse.create({
          data: {
            productId: validated.productId,
            courseId: validated.courseId,
            lessonsIncluded:
              productType === "CLIP" || validated.unlimited
                ? 0
                : validated.lessonsIncluded,
            unlimited: validated.unlimited ?? false,
          },
        });
      });

      return {
        success: true,
        msg: `Kursen lades in i produkten.`,
      };
    }
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte uppdatera kurskopplingen." };
  }
}

/**
 * Removes a course from a product.
 * @returns success (boolean) and a msg.
 * @auth Admin
 */
export async function removeCourseInProduct(
  formData: z.output<typeof AdminProductCourseItemSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await AdminProductCourseItemSchema.parseAsync(formData);

    await prisma.$transaction(async (tx) => {
      await tx.productOnCourse.delete({
        where: {
          courseId_productId: {
            productId: validated.productId,
            courseId: validated.courseId,
          },
        },
      });
      await updateProductType(validated.productId, { tx });
    });
    return {
      success: true,
      msg: `Kursen togs bort i produkten.`, // fix
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte ta bort kursen från produkten." };
  }
}

/**
 * Checks if a course is in a product.
 * @returns found (boolean) and a count of how many lessonsIncluded.
 * @auth Admin
 */
export async function isCourseInProduct(
  courseId: string,
  productId: string,
): Promise<boolean> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return false;

  try {
    const found = await prisma.productOnCourse.findUnique({
      where: { courseId_productId: { courseId, productId } },
    });

    if (found) return true;
    return false;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export type PrismaTx = Prisma.TransactionClient;

// Uppdaterar product.type baserat på om det är klippkort eller hur många kurser som är kopplade.
export async function updateProductType(
  productId: string,
  options?: { isClip?: boolean; tx?: PrismaTx },
): Promise<"COURSE" | "PACK" | "CLIP"> {
  const client = options?.tx ?? prisma;

  const product = await client.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      type: true,
      courses: { select: { courseId: true } },
    },
  });

  if (!product) {
    throw new Error("Product not found.");
  }

  const isClip = options?.isClip ?? product.type === "CLIP";
  const nextType = isClip
    ? "CLIP"
    : product.courses.length > 1
      ? "PACK"
      : "COURSE";

  if (product.type !== nextType) {
    await client.product.update({
      where: { id: product.id },
      data: { type: nextType },
    });
  }

  return nextType;
}

/* ********************************** admin bokning från attendenceform ***************************************** */
/** Okej, har försökt förenkla typen så det blir lättare att jobba med i ui */

export type StudentWithPurchaseItemsWithCourse = {
  studentId: string;
  customer: { id: string; name: string }; // För att kunna ange userId i UI.
  participant: Participant | null; // För att visa deltagaren
  displayName: string; // Hur namnet skall visas i select för deltagare dvs Deltagarnamn (köpare).
  purchaseItems: {
    purchaseItem: {
      id: string;
      remainingCount: number | null;
      unlimited: boolean;
    };
    purchase: {
      id: string;
      type: ProductType;
      participant: Participant | null;
      remainingCount: number | null;
      product: { id: string; name: string };
    };
  }[];
};

/**
 * Type for users with their purchases for a specific course.
 * Used in admin booking management.
 */
export type UserPurchasesForCourse = {
  id: string;
  name: string;
  purchases: {
    id: string;
    type: "COURSE" | "PACK" | "CLIP";
    remainingCount: number | null;
    participant: Participant | null;
    product: {
      id: string;
      name: string;
    };
    PurchaseItems: {
      id: string;
      courseId: string;
      remainingCount: number;
      unlimited: boolean;
      course: {
        id: string;
        name: string;
      };
    }[];
  }[];
};

// Om detta funkar så ändrar jag själva funktionen ja.
/**
 * Gets all users that have purchased products containing a specific course.
 * @param courseId The course to filter by.
 * @returns Array of users with their purchases for that course.
 * @auth Admin
 */
export async function getUsersWithPurchasedProductsWithCourseInIt(
  courseId: string,
): Promise<StudentWithPurchaseItemsWithCourse[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  try {
    const users = await prisma.user.findMany({
      where: {
        purchases: {
          some: {
            PurchaseItems: {
              some: {
                courseId: courseId,
              },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        purchases: {
          where: {
            PurchaseItems: {
              some: {
                courseId: courseId,
              },
            },
          },
          select: {
            id: true,
            participant: true,
            type: true,
            remainingCount: true,
            participantId: true,
            product: {
              select: {
                id: true,
                name: true,
              },
            },
            PurchaseItems: {
              where: {
                courseId: courseId,
              },
              select: {
                id: true,
                courseId: true,
                remainingCount: true,
                unlimited: true,
                course: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const students = new Map<string, StudentWithPurchaseItemsWithCourse>();

    for (const user of users) {
      for (const purchase of user.purchases) {
        const ownerName = user.name;
        const part = purchase.participant?.name ?? ownerName;
        const isOwner = part === ownerName;
        const studentId = purchase.participant?.id ?? user.id;
        const displayName = isOwner
          ? ownerName
          : `${part} (kund: ${ownerName})`;

        const nextPurchaseItems = purchase.PurchaseItems.map(
          (purchaseItem) => ({
            purchaseItem: {
              id: purchaseItem.id,
              remainingCount: purchaseItem.remainingCount,
              unlimited: purchaseItem.unlimited,
            },
            purchase: {
              id: purchase.id,
              type: purchase.type,
              participant: purchase.participant,
              remainingCount: purchase.remainingCount,
              product: purchase.product,
            },
          }),
        );

        const existing = students.get(studentId);
        if (!existing) {
          students.set(studentId, {
            studentId,
            customer: { id: user.id, name: user.name },
            participant: purchase.participant,
            displayName,
            purchaseItems: nextPurchaseItems,
          });
          continue;
        }

        const existingIds = new Set(
          existing.purchaseItems.map((item) => item.purchaseItem.id),
        );
        for (const item of nextPurchaseItems) {
          if (!existingIds.has(item.purchaseItem.id)) {
            existing.purchaseItems.push(item);
          }
        }
      }
    }

    return [...students.values()];
  } catch (e) {
    console.error("Error fetching users with purchases:", e);
    return [];
  }
}

/* ********************************** //admin bokning från attendeform ***************************************** */

export type BookingWithUserAndParticipant = Booking & {
  user: User;
  purchaseItem: {
    purchase: { participant: Participant | null; product: Product } & Purchase;
  } & PurchaseItem;
};

export async function getBookings(
  lessonId: string,
): Promise<BookingWithUserAndParticipant[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  try {
    const bookings = await prisma.booking.findMany({
      where: { lessonId },
      include: {
        user: true,
        purchaseItem: {
          include: {
            purchase: { include: { participant: true, product: true } },
          },
        },
      },
    });

    if (bookings) return bookings;

    return [];
  } catch (e) {
    console.error("Fel vid bokning:", e);
    return [];
  }
}

// Kanske flytta ut denna sen från admin, tänker att vi använder samma för bokning ifrån profilsidan också.
export async function addUserInLesson(
  formData: z.output<typeof AddStudentToLessonForm>,
): Promise<{ success: boolean; msg: string }> {
  const validated = await AddStudentToLessonForm.parseAsync(formData);
  const session = await auth.api.getSession({ headers: await headers() });
  const isAdmin = await isAdminRole();

  if (!session) return { success: false, msg: "Ingen session." };
  if (session.user.id !== validated.userId) {
    if (!isAdmin) return { success: false, msg: "Ingen behörighet." };
  }

  try {
    // hämta purchaseItem och purchase för kontroller
    const pitem = await prisma.purchaseItem.findUnique({
      where: { id: validated.purchaseItemId },
      include: { purchase: true, course: true },
    });

    if (!pitem) return { success: false, msg: "Ingen purchaseItem hittades." };
    // Kontrollera om purchaseItem redan har använts på lektionen.

    const existingBooking = await prisma.booking.findFirst({
      where: pitem.purchase.participantId
        ? {
            // Deltagare-bokning: samma participant får inte bokas två gånger
            lessonId: validated.lessonId,
            purchaseItem: {
              purchase: { participantId: pitem.purchase.participantId },
            },
          }
        : {
            // Owner-bokning: samma user får inte bokas två gånger som owner
            lessonId: validated.lessonId,
            userId: validated.userId,
            purchaseItem: {
              purchase: { participantId: null },
            },
          },
    });

    if (existingBooking) {
      return {
        success: false,
        msg: "Deltagaren har redan bokats på denna lektion.",
      };
    }

    // 2. Kolla status på lektionen
    const lesson = await prisma.lesson.findUnique({
      where: { id: validated.lessonId },
    });

    if (!lesson || lesson.cancelled) {
      return {
        success: false,
        msg: "Lektionen är inställd eller hittades inte.",
      };
    }

    if (!pitem.purchase)
      return { success: false, msg: "Ingen purchase hittades." };

    // Kolla så kursen är samma.
    if (pitem?.courseId !== lesson.courseId)
      return { success: false, msg: "Kursen stämmer ej med vald produkt." };

    const hasClips = hasRemainingCount(
      calcRemainingCount({ purchase: pitem.purchase, purchaseItem: pitem }),
    );

    if (!hasClips)
      return { success: false, msg: "inga tillgängliga klipp i vald produkt" };

    if (!isAdmin && lesson.startTime.getTime() < Date.now()) {
      return {
        success: false,
        msg: "Lektionen har redan varit, ednast lärare kan lägga in bakåt i tiden.",
      };
    }

    // 3. Utför bokning och saldo-dragning i en transaktion
    await prisma.$transaction(async (tx) => {
      await tx.booking.create({
        data: {
          lessonId: validated.lessonId,
          userId: validated.userId,
          purchaseItemId: validated.purchaseItemId,
        },
      });

      const clipResult = await handleClips(tx, validated.purchaseItemId, -1);

      if (!clipResult.success) {
        throw new Error(clipResult.msg || "Kunde inte uppdatera saldo.");
      }
    });

    revalidatePath("/admin/lectures");
    revalidatePath("/admin");
    revalidatePath("/user");

    return { success: true, msg: `Bokning slutförd!` };
  } catch (e) {
    console.error("Fel vid admin-bokning:", e);
    return { success: false, msg: "Ett tekniskt fel uppstod vid bokningen." };
  }
}

/**
 * Admin function to remove a user from a lesson and restore their clips.
 * @param purchaseItemId The purchaseItem to remove.
 * @param lessonId The lesson to remove from.
 * @returns Success status and message.
 * @auth Admin
 */
export async function removeUserFromLesson(
  purchaseItemId: string,
  lessonId: string,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "Ingen behörighet." };

  try {
    // 1. Hitta bokningen
    const booking = await prisma.booking.findFirst({
      where: {
        purchaseItem: { id: purchaseItemId },
        lessonId: lessonId,
      },
    });

    if (!booking) {
      return { success: false, msg: "Bokningen hittades inte." };
    }

    // 2. Ta bort bokningen och återställ saldo i en transaktion
    await prisma.$transaction(async (tx) => {
      // Återställ saldo
      const clipResult = await handleClips(tx, booking.purchaseItemId, 1);

      if (!clipResult.success) {
        throw new Error(clipResult.msg || "Kunde inte återställa saldo.");
      }

      // Ta bort bokningen
      await tx.booking.delete({
        where: { id: booking.id },
      });
    });

    revalidatePath("/admin/lectures");

    return { success: true, msg: "Bokningen har tagits bort." };
  } catch (e) {
    console.error("Fel vid borttagning av bokning:", e);
    return { success: false, msg: "Ett tekniskt fel uppstod." };
  }
}
