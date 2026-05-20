import { TZDate } from "@date-fns/tz";
import { addDays, format } from "date-fns";
import { revalidatePath } from "next/cache";
import type z from "zod";
import type { Prisma, Weekday } from "@/generated/prisma/client";
import {
  adminAddCourseToSchemaSchema,
  adminAddTerminSchema,
} from "@/validations/adminforms";
import prisma from "../prisma";
import { formToDbDate, getZonedHoursMinutes } from "../time-convert";
import { isAdminRole } from "./admin";
import { handleClips } from "./purchase-actions";

/**
 * Creating lessons bases on a schemaItem.
 * @returns Success (boolean) and a message.
 */
async function CreateLessons(
  schemaItemId: string,
  tx?: Prisma.TransactionClient,
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

    // FIX 2: Iterera med TZDate för att göra dygnsövergångarna (DST) 100% säkra
    let currentDate = new TZDate(startDate.getTime(), timeZone);
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

        // FIX 1: Konvertera TZDate till standard JS-Date för att Prisma ska acceptera det
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

      // Anropar din nya, helt DST- och TZDate-säkrade lektionsgenerator
      const lessons = await CreateLessons(newSchemaItem.id, tx);

      if (!lessons.success) {
        throw new Error(
          "Inga lektioner kunde skapas inom denna termin. Kontrollera startDate och endDate så de täcker bokningsbara dagar.",
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

/**
 * Edit schemaitems and lessons when editing a course in a termin week schema.
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

    // SÄKRAD DATUMHANTERING: Kontrollera tomma strängar ordentligt
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

    const result = await prisma.$transaction(async (tx) => {
      // 1. ÅTERBETALA KLIPP TILL ELEVER: Hämta alla bokningar på de lektioner som ska tas bort
      const affectedBookings = await tx.booking.findMany({
        where: {
          lesson: {
            schemaItemId: schemaItemId,
          },
        },
        select: { id: true, purchaseItemId: true },
      });

      for (const booking of affectedBookings) {
        if (!booking.purchaseItemId) continue;

        // Betala tillbaka 1 klipp per bokning som ryker
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

      // 3. Rensa gamla lektioner (deras tillhörande bokningar tas bort via cascade/manuell koppling)
      await tx.lesson.deleteMany({
        where: { schemaItemId: schemaItemId },
      });

      // 4. FIX: Kör CreateLessons INUTI transaktionen och skicka med `tx`
      const lessons = await CreateLessons(schemaItemId, tx);

      if (!lessons.success) {
        throw new Error(
          "Kunde inte generera nya lektioner för det ändrade schemat. Kontrollera dina datum.",
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

/**
 * Updates a "termin".
 * @returns An object with success (boolean) and a msg.
 * @auth Admin
 */
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

    const result = await prisma.$transaction(async (tx) => {
      // 1. Uppdatera själva terminen
      const updatedTermin = await tx.termin.update({
        where: { id },
        data: {
          ...validated,
          startDate: formToDbDate(validated.startDate),
          endDate: formToDbDate(validated.endDate),
        },
      });

      if (dateIsChanged) {
        // 2. Hämta alla schemaItems för att synka lektioner
        const schemaItems = await tx.schemaItem.findMany({
          where: { terminId: id },
          include: {
            course: true,
          },
        });

        // 3. Hantera bokningar och lektioner som hamnar utanför de nya tidsramarna
        for (const item of schemaItems) {
          const followsStart = item.customStartDate === null;
          const followsEnd = item.customEndDate === null;

          const validStart = followsStart ? newStartDate : item.customStartDate;
          const validEnd = followsEnd ? newEndDate : item.customEndDate;

          if (!validStart || !validEnd)
            throw new Error("ValidStart eller ValidEnd är null");

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
            if (!booking.purchaseItemId) continue;

            const clipResult = await handleClips(tx, booking.purchaseItemId, 1);
            if (!clipResult.success) {
              throw new Error(clipResult.msg || "Clip update failed.");
            }
          }

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

        // 4. SÄKRAD GENERERING: Skapa nya lektioner för de datum som ev tillkommit
        const timeZone = "Europe/Stockholm";

        const remainingLessons = await tx.lesson.findMany({
          where: { schemaItemId: { in: schemaItems.map((i) => i.id) } },
          select: { schemaItemId: true, startTime: true },
        });

        const remainingSet = new Set(
          remainingLessons.map(
            (l) => `${l.schemaItemId}:${l.startTime.getTime()}`,
          ),
        );

        const lessonsToCreate = [];

        for (const item of schemaItems) {
          const followsStart = item.customStartDate === null;
          const followsEnd = item.customEndDate === null;

          const actualStart = followsStart
            ? newStartDate
            : item.customStartDate;
          const actualEnd = followsEnd ? newEndDate : item.customEndDate;

          if (!actualStart)
            throw new Error(`SchemaItem ${item.id} saknar customStartDate.`);
          if (!actualEnd)
            throw new Error(`SchemaItem ${item.id} saknar customEndDate.`);

          // Extrahera timmar/minuter från Stockholm-tid (t.ex. 18 och 00)
          const { hours: startHours, minutes: startMinutes } =
            getZonedHoursMinutes(item.timeStart);
          const { hours: endHours, minutes: endMinutes } = getZonedHoursMinutes(
            item.timeEnd,
          );

          // Initiera iterationsdatum och stopp-datum som säkra TZDate-objekt
          let currentDate = new TZDate(actualStart.getTime(), timeZone);
          const endTimestamp = actualEnd.getTime();

          while (currentDate.getTime() <= endTimestamp) {
            // Hämta veckodagsindex ("1" för måndag, "7" för söndag) tvingat i svensk tid
            const currentZonedWeekdayStr = format(currentDate, "i");
            const currentZonedDayOfWeek =
              currentZonedWeekdayStr === "7"
                ? 0
                : Number(currentZonedWeekdayStr);

            // Mappa databasens Weekday enum (MONDAY, TUESDAY...) till rätt index
            const WEEKDAY_MAP: Record<Weekday, number> = {
              MONDAY: 1,
              TUESDAY: 2,
              WEDNESDAY: 3,
              THURSDAY: 4,
              FRIDAY: 5,
              SATURDAY: 6,
              SUNDAY: 0,
            };
            const targetDay = WEEKDAY_MAP[item.weekday];

            if (currentZonedDayOfWeek === targetDay) {
              const dateStr = format(currentDate, "yyyy-MM-dd");
              const pad = (n: number) => String(n).padStart(2, "0");

              // Sätt ihop tidpunkterna direkt i måltidszonen Europe/Stockholm helt utan string-hacks
              const combinedStartTime = new TZDate(
                `${dateStr}T${pad(startHours)}:${pad(startMinutes)}:00`,
                timeZone,
              );

              const exists = remainingSet.has(
                `${item.id}:${combinedStartTime.getTime()}`,
              );

              if (!exists) {
                const combinedEndTime = new TZDate(
                  `${dateStr}T${pad(endHours)}:${pad(endMinutes)}:00`,
                  timeZone,
                );

                // Konvertera tillbaka till standard JS Date för Prisma-motorn
                lessonsToCreate.push({
                  startTime: new Date(combinedStartTime.getTime()),
                  endTime: new Date(combinedEndTime.getTime()),
                  terminId: id,
                  courseId: item.courseId,
                  teacherId: item.course.teacherId,
                  schemaItemId: item.id,
                });
              }
            }

            // Gå framåt exakt ett kalenderdygn (ignorerar om dygnet råkar ha 23 eller 25 timmar pga DST)
            currentDate = addDays(currentDate, 1);
          }
        }

        if (lessonsToCreate.length > 0) {
          await tx.lesson.createMany({
            data: lessonsToCreate,
          });
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
 * Checks if any lessons are affected if Start/End date changes.
 * Excludes schemaItems that have custom dates set.
 * @returns Count of affected bookings.
 * @auth Admin
 */
export async function checkTerminDateChange(
  terminId: string,
  newStartStr: string, // Ändrat: Tar nu emot rå sträng ("YYYY-MM-DD")
  newEndStr: string, // Ändrat: Tar nu emot rå sträng ("YYYY-MM-DD")
): Promise<{ count: number }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { count: 0 };

  try {
    // Gör om strängarna från kalendern till säkra midnattstidstämplar i databasformat
    const targetStart = formToDbDate(newStartStr);
    const targetEnd = formToDbDate(newEndStr);

    const affectedBookings = await prisma.booking.count({
      where: {
        lesson: {
          terminId: terminId,
          // Regel från din kommentar: Berör INTE schema-items med satta customDates!
          schemaItem: {
            customStartDate: null,
            customEndDate: null,
          },
          OR: [
            { startTime: { lt: targetStart } },
            { startTime: { gt: targetEnd } },
          ],
        },
        cancelled: false, // Räkna bara aktiva bokningar som faktiskt påverkas
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

    // SÄKRAD DATUMHANTERING: formToDbDate låser datumsträngarna ("YYYY-MM-DD")
    // till perfekt midnatt (00:00:00) i svensk tidszon innan det sparas i UTC.
    const newTermin = await prisma.termin.create({
      data: {
        ...validated,
        startDate: formToDbDate(validated.startDate),
        endDate: formToDbDate(validated.endDate),
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
