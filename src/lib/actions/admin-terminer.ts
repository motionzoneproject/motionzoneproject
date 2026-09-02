"use server";

import { TZDate } from "@date-fns/tz";
import { addDays, format } from "date-fns";
import { revalidatePath } from "next/cache";
import type z from "zod";
import type { Prisma, Weekday } from "@/generated/prisma/client";
import {
  adminAddCourseToSchemaSchema,
  adminAddTerminSchema,
} from "@/validations/adminforms";
import { handleClips } from "../clips";
import { endOfStockholmDay } from "../date-utils";
import prisma from "../prisma";
import { formToDbDate, getZonedHoursMinutes } from "../time-convert";
import { isAdminRole } from "./admin";

/**
 * Creating lessons bases on a schemaItem.
 * @returns Success (boolean) and a message.
 */
async function CreateLessons(
  schemaItemId: string,
  tx?: Prisma.TransactionClient,
  fromDate?: Date, // Så vi kan avgöra om den bara ska skapa från nu och framåt.
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
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

    const targetDay = WEEKDAY_MAP[schemaItm.weekday];
    const startDate = schemaItm.customStartDate ?? schemaItm.termin.startDate;
    const endDate = schemaItm.customEndDate ?? schemaItm.termin.endDate;
    const teacherId = schemaItm.course.teacherId;

    const lessonsToCreate = [];
    const timeZone = "Europe/Stockholm";

    const { hours: startHours, minutes: startMinutes } = getZonedHoursMinutes(
      schemaItm.timeStart,
    );
    const { hours: endHours, minutes: endMinutes } = getZonedHoursMinutes(
      schemaItm.timeEnd,
    );

    // FIX 2: Iterera med TZDate för att göra dygnsövergångarna (DST) 100% säkra.
    const effectiveStart =
      fromDate && fromDate > startDate ? fromDate : startDate; // Skapa inte bakåt om fromDate är satt
    let currentDate = new TZDate(effectiveStart.getTime(), timeZone);

    const endTimestamp = endDate.getTime();

    while (currentDate.getTime() <= endTimestamp) {
      const currentZonedWeekdayStr = format(currentDate, "i");

      const currentZonedDayOfWeek =
        currentZonedWeekdayStr === "7" ? 0 : Number(currentZonedWeekdayStr);

      if (currentZonedDayOfWeek === targetDay) {
        const dateStr = format(currentDate, "yyyy-MM-dd");
        const pad = (n: number) => String(n).padStart(2, "0");

        const combinedStartTime = new TZDate(
          `${dateStr}T${pad(startHours)}:${pad(startMinutes)}:00`,
          timeZone,
        );

        const combinedEndTime = new TZDate(
          `${dateStr}T${pad(endHours)}:${pad(endMinutes)}:00`,
          timeZone,
        );

        lessonsToCreate.push({
          startTime: new Date(combinedStartTime.getTime()),
          endTime: new Date(combinedEndTime.getTime()),
          terminId: schemaItm.termin.id,
          courseId: schemaItm.course.id,
          teacherId: teacherId,
          schemaItemId: schemaItm.id,
        });
      }

      currentDate = addDays(currentDate, 1);
    }

    if (lessonsToCreate.length === 0) {
      return {
        success: false,
        msg: "No matching days found to create lessons.",
      };
    }

    const _results = await db.lesson.createMany({
      data: lessonsToCreate,
      skipDuplicates: true,
    });

    return {
      success: true,
      msg: `Lektioner skapade`,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte skapa lektioner." };
  }
}

/**
 * Creating schemaitems and lessons when adding a course to a termin week schema.
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

    const studioId = validated.studio?.trim() || undefined;

    if (studioId) {
      const studioExist = await prisma.studio.findUnique({
        where: { id: studioId },
        select: { id: true },
      });
      if (!studioExist)
        throw new Error(`Studio with id ${validated.studio} was not found.`);
    }

    const result = await prisma.$transaction(async (tx) => {
      const termin = await tx.termin.findUnique({ where: { id: terminId } });
      if (!termin) throw new Error("No termin.");

      // SÄKRAD DATUMHANTERING: formToDbDate tar hand om de råa datumsträngarna
      const finalStartDate =
        validated.customStartDate && validated.customStartDate.trim() !== ""
          ? formToDbDate(validated.customStartDate)
          : null;

      const finalEndDate =
        validated.customEndDate && validated.customEndDate.trim() !== ""
          ? formToDbDate(validated.customEndDate)
          : null;

      // För tidsfälten (t.ex. "18:00") pusslar vi ihop det med ett neutralt basdatum
      // för jag vill att formToDbDate tolkar timmarna exakt efter svensk lokal tid.
      const newSchemaItem = await tx.schemaItem.create({
        data: {
          terminId,
          studioId: studioId ?? null,
          courseId: validated.courseId,
          timeStart: formToDbDate(`1970-01-01T${validated.timeStart}:00`),
          timeEnd: formToDbDate(`1970-01-01T${validated.timeEnd}:00`),
          customStartDate: finalStartDate,
          customEndDate: finalEndDate,
          weekday: validated.day as Weekday,
        },
        include: { course: true, termin: true },
      });

      const lessons = await CreateLessons(newSchemaItem.id, tx);

      if (
        !lessons.success &&
        lessons.msg !== "No matching days found to create lessons."
      ) {
        throw new Error(
          `Skapande av lektioner misslyckades ${lessons.msg}. Kunde inte ändra lägga till schemaItem`,
        );
      }

      return { newSchemaItem, lessonsMsg: lessons.msg };
    });

    revalidatePath("/admin/courses");

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

    // SÄKRAD DATUMHANTERING
    const finalStartDate =
      validated.customStartDate && validated.customStartDate.trim() !== ""
        ? formToDbDate(validated.customStartDate)
        : null;
    const finalEndDate =
      validated.customEndDate && validated.customEndDate.trim() !== ""
        ? formToDbDate(validated.customEndDate)
        : null;

    const studioId = validated.studio?.trim() || undefined;

    if (studioId) {
      const studioExist = await prisma.studio.findUnique({
        where: { id: studioId },
        select: { id: true },
      });
      if (!studioExist)
        throw new Error(`Studio with id ${validated.studio} was not found.`);
    }

    // Skapa en JavaScript-date för "just nu" i UTC/lokal tid för att skydda historiken (med TZDate såklart)
    const timeZone = "Europe/Stockholm";

    const now = new TZDate(new Date(), timeZone);

    const result = await prisma.$transaction(async (tx) => {
      // 1. ÅTERBETALA KLIPP: Hämta ENBART bokningar på FRAMTIDA lektioner som ska tas bort
      const affectedBookings = await tx.booking.findMany({
        where: {
          lesson: {
            schemaItemId: schemaItemId,
            startTime: { gte: now }, // Rör inte avklarade lektioner!
          },
        },
        select: { id: true, purchaseItemId: true },
      });

      for (const booking of affectedBookings) {
        if (!booking.purchaseItemId) continue;

        const clipResult = await handleClips(tx, booking.purchaseItemId, 1);
        if (!clipResult.success) {
          throw new Error(
            clipResult.msg || "Kunde inte återställa elevens klipp.",
          );
        }
      }

      // 2. Uppdatera själva schemaraden
      const updatedSchemaItem = await tx.schemaItem.update({
        where: { id: schemaItemId },
        data: {
          terminId,
          studioId: studioId ?? null,
          courseId: validated.courseId,
          timeStart: formToDbDate(`1970-01-01T${validated.timeStart}:00`),
          timeEnd: formToDbDate(`1970-01-01T${validated.timeEnd}:00`),
          customStartDate: finalStartDate,
          customEndDate: finalEndDate,
          weekday: validated.day as Weekday,
        },
        include: { course: true, termin: true },
      });

      // 3. Rensa ENBART framtida lektioner (behåll historiken för gamla klasser)
      await tx.lesson.deleteMany({
        where: {
          schemaItemId: schemaItemId,
          startTime: { gte: now },
        },
      });

      // 4. Generera nya lektioner i tomrummet framåt
      const lessons = await CreateLessons(schemaItemId, tx, now);

      if (
        !lessons.success &&
        lessons.msg !== "No matching days found to create lessons."
      ) {
        throw new Error(
          `Skapande av lektioner misslyckades: ${lessons.msg}. Kunde inte ändra schemat.`,
        );
      }

      return { updatedSchemaItem, lessonsMsg: lessons.msg };
    });

    revalidatePath("/admin/termin");
    revalidatePath("/admin/courses");

    return {
      success: true,
      msg: `Kursen ${result.updatedSchemaItem.course.name} har uppdaterats i ${result.updatedSchemaItem.termin.name}. ${result.lessonsMsg}`,
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
    // All databasinteraktion packas in i transaktionen för att undvika race conditions
    const result = await prisma.$transaction(async (tx) => {
      // 1. FIX: Hämta bokningarna INUTI transaktionen med 'tx'
      const bookings = await tx.booking.findMany({
        where: {
          lesson: { schemaItemId: id },
          cancelled: false,
        },
        select: {
          id: true,
          purchaseItemId: true,
        },
      });

      // 2. Återställ klipp för de aktiva bokningar som hittades
      if (bookings.length > 0) {
        for (const booking of bookings) {
          if (!booking.purchaseItemId) continue;

          const clipResult = await handleClips(tx, booking.purchaseItemId, 1);
          if (!clipResult.success) {
            throw new Error(clipResult.msg || "Kunde inte återställa klipp.");
          }
        }
      }

      // 3. Ta bort schemaposten (och via cascade raderas lektioner och bokningar)
      const del = await tx.schemaItem.delete({
        where: { id },
        select: { course: { select: { name: true } } },
      });

      return {
        success: true,
        msg: `${del.course.name} och dess bokningar togs bort. ${bookings.length} klipp har återställts till eleverna.`,
      };
    });

    // Revalidate efter att transaktionen har lyckats och stängts
    revalidatePath("/admin/courses");
    revalidatePath("/admin/termin");

    return result;
  } catch (e) {
    console.error(e);
    const msg =
      e instanceof Error
        ? e.message
        : "Ett fel uppstod vid radering av schemaposten.";
    return {
      success: false,
      msg,
    };
  }
}

export async function editTermin(
  id: string,
  formData: z.infer<typeof adminAddTerminSchema>,
  dateIsChanged: boolean = true,
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const existingTermin = await prisma.termin.findUniqueOrThrow({
      where: { id },
    });

    const validated = await adminAddTerminSchema.parseAsync(formData);

    const newStartDate = dateIsChanged
      ? formToDbDate(validated.startDate)
      : existingTermin.startDate;
    const newEndDate = dateIsChanged
      ? formToDbDate(validated.endDate)
      : existingTermin.endDate;

    const timeZone = "Europe/Stockholm";

    const now = new TZDate(new Date(), timeZone);

    const result = await prisma.$transaction(async (tx) => {
      const { startDate, endDate, ...rest } = validated;

      const updatedTermin = await tx.termin.update({
        where: { id },
        data: {
          ...rest,
          startDate: formToDbDate(startDate),
          endDate: formToDbDate(endDate),
        },
      });

      if (dateIsChanged) {
        const schemaItems = await tx.schemaItem.findMany({
          where: { terminId: id },
          include: { course: true },
        });

        for (const item of schemaItems) {
          const followsStart = item.customStartDate === null;
          const followsEnd = item.customEndDate === null;

          const validStart = followsStart ? newStartDate : item.customStartDate;
          const validEnd = followsEnd ? newEndDate : item.customEndDate;

          if (!validStart || !validEnd)
            throw new Error("ValidStart eller ValidEnd är null");

          // Slutdatumet är inklusivt: CreateLessons skapar lektioner ända t.o.m.
          // periodens sista dag (på klockslaget). Jämför därför mot slutet av den
          // dagen, annars flaggas sista dagens lektion felaktigt som "utanför".
          const validEndInclusive = endOfStockholmDay(validEnd);

          const affectedBookings = await tx.booking.findMany({
            where: {
              lesson: {
                schemaItemId: item.id,
                startTime: { gte: now }, // Så baara från nu. historik behålls.
                OR: [
                  { startTime: { lt: validStart } },
                  { startTime: { gt: validEndInclusive } },
                ],
              },
            },
            select: { id: true, purchaseItemId: true },
          });

          for (const booking of affectedBookings) {
            if (!booking.purchaseItemId) continue;
            const clipResult = await handleClips(tx, booking.purchaseItemId, 1);
            if (!clipResult.success) {
              throw new Error(clipResult.msg || "Clip update failed.");
            }
          }

          await tx.lesson.deleteMany({
            where: {
              schemaItemId: item.id,
              startTime: { gte: now },
              OR: [
                { startTime: { lt: validStart } },
                { startTime: { gt: validEndInclusive } },
              ],
            },
          });
        }

        for (const item of schemaItems) {
          const lessons = await CreateLessons(item.id, tx, now);
          if (
            !lessons.success &&
            lessons.msg !== "No matching days found to create lessons."
          ) {
            throw new Error(
              `Skapande av lektioner misslyckades för ${item.id}: ${lessons.msg}. Kunde inte ändra terminen`,
            );
          }
        }
      }

      return updatedTermin;
    });

    revalidatePath("/admin/courses");

    return {
      success: true,
      msg: `Terminen "${result.name}" har uppdaterats. ${dateIsChanged ? "Eventuella lektioner och bokningar utanför perioden har raderats och bokningar har återställts till eleverna." : ""}`,
    };
  } catch (e) {
    console.error("Fel vid editTermin:", e);
    const msg =
      e instanceof Error ? e.message : "Ett fel uppstod vid uppdatering.";
    return { success: false, msg };
  }
}

/**
 * Checks if any future lessons are affected if Start/End date changes.
 * Excludes schemaItems that have custom dates set.
 * @returns Count of affected bookings.
 * @auth Admin
 */
export async function checkTerminDateChange(
  terminId: string,
  newStartStr: string,
  newEndStr: string,
): Promise<{ count: number }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { count: 0 };

  try {
    const timeZone = "Europe/Stockholm";

    const now = new TZDate(new Date(), timeZone);
    const targetStart = formToDbDate(newStartStr);
    // Inklusivt slutdatum: lektioner på sista dagen ligger inom perioden.
    const targetEndInclusive = endOfStockholmDay(formToDbDate(newEndStr));

    const affectedBookings = await prisma.booking.count({
      where: {
        lesson: {
          terminId: terminId,
          startTime: { gte: now }, // Bara framtida
          schemaItem: {
            customStartDate: null,
            customEndDate: null,
          },
          OR: [
            { startTime: { lt: targetStart } },
            { startTime: { gt: targetEndInclusive } },
          ],
        },
        cancelled: false,
      },
    });

    return { count: affectedBookings };
  } catch (e) {
    console.error("Fel i checkTerminDateChange:", e);
    return { count: 0 };
  }
}

/**
 * Creates a new "termin".
 * @param formData - formdata for creating the new termin.
 * @returns An object with success (boolean) and a msg.
 * Returns an error msg if not admin or validation fails.
 * @auth Admin
 */
export async function addNewTermin(
  formData: z.infer<typeof adminAddTerminSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    // Validate terminSchema.
    const validated = await adminAddTerminSchema.parseAsync(formData);

    // ⚡ FIX: Plocka ut strängarna separat så att de INTE följer med i 'rest'
    const { startDate, endDate, ...rest } = validated;

    const newTermin = await prisma.termin.create({
      data: {
        ...rest, // Innehåller name och name_en
        startDate: formToDbDate(startDate), // Skickar ett rent och säkert Date-objekt till Prisma
        endDate: formToDbDate(endDate), // Skickar ett rent och säkert Date-objekt till Prisma
      },
    });

    revalidatePath("/admin/termin");

    return {
      success: true,
      msg: `Terminen "${newTermin.name}" skapades framgångsrikt.`,
    };
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Kunde inte skapa terminen.";
    return { success: false, msg };
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
    // 2. Kör transaktionen
    const result = await prisma.$transaction(async (tx) => {
      // 1. Hitta alla aktiva bokningar kopplade till denna termin
      const bookings = await tx.booking.findMany({
        where: {
          lesson: { terminId: id },
          cancelled: false, // Hmm, ska vi verkligen ignorera detta? Kommer ligga onödiga bokningar. Eller just det, ja för annars betalas inställda bokningar tillbaka. Ev. fix för att inte ha onödig data i db.
        },
        select: { purchaseItemId: true },
      });
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
      msg: `Terminen ${result} och tillhörande bokningar raderades. Klipp har återställts.`,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      msg: "Kunde inte radera terminen. Kontrollera om den har aktiva kopplingar som hindrar radering.",
    };
  }
}
