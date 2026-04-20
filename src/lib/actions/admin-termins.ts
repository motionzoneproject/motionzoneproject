"use server";

import { revalidatePath } from "next/cache";
import type z from "zod";
import type { Termin } from "@/generated/prisma/client";
import { adminAddTerminSchema } from "@/validations/adminforms";
import prisma from "../prisma";
import { isAdminRole } from "./admin-shared";
import { handleClips } from "./purchase-actions";

/**
 * Get a list of all "terminer" in db.
 * @returns Promise of Terminer as a list of Termin[].
 * @auth Admin
 */
export async function getTerminer(showInactive = false): Promise<Termin[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  const terminer = await prisma.termin.findMany({
    where: showInactive ? undefined : { active: true },
    orderBy: { startDate: "asc" },
  });
  return terminer;
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

export async function toggleTerminActive(
  id: string,
  active: boolean,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const termin = await tx.termin.update({
        where: { id },
        data: { active },
      });

      if (active) {
        return {
          termin,
          deactivatedCourses: 0,
          deactivatedProducts: 0,
        };
      }

      const linkedCourses = await tx.schemaItem.findMany({
        where: { terminId: id },
        select: { courseId: true },
        distinct: ["courseId"],
      });

      const linkedCourseIds = linkedCourses.map((item) => item.courseId);

      if (linkedCourseIds.length === 0) {
        return {
          termin,
          deactivatedCourses: 0,
          deactivatedProducts: 0,
        };
      }

      const coursesToDeactivate = await tx.course.findMany({
        where: {
          id: { in: linkedCourseIds },
          active: true,
          schemaItems: {
            none: {
              termin: {
                active: true,
              },
            },
          },
        },
        select: { id: true },
      });

      const courseIdsToDeactivate = coursesToDeactivate.map((item) => item.id);

      if (courseIdsToDeactivate.length > 0) {
        await tx.course.updateMany({
          where: { id: { in: courseIdsToDeactivate } },
          data: { active: false },
        });
      }

      const linkedProducts = await tx.productOnCourse.findMany({
        where: { courseId: { in: linkedCourseIds } },
        select: { productId: true },
        distinct: ["productId"],
      });

      const linkedProductIds = linkedProducts.map((item) => item.productId);

      if (linkedProductIds.length === 0) {
        return {
          termin,
          deactivatedCourses: courseIdsToDeactivate.length,
          deactivatedProducts: 0,
        };
      }

      const productsToDeactivate = await tx.product.findMany({
        where: {
          id: { in: linkedProductIds },
          active: true,
          NOT: {
            courses: {
              some: {
                course: {
                  active: true,
                  schemaItems: {
                    some: {
                      termin: {
                        active: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        select: { id: true },
      });

      const productIdsToDeactivate = productsToDeactivate.map(
        (item) => item.id,
      );

      if (productIdsToDeactivate.length > 0) {
        await tx.product.updateMany({
          where: { id: { in: productIdsToDeactivate } },
          data: { active: false },
        });
      }

      return {
        termin,
        deactivatedCourses: courseIdsToDeactivate.length,
        deactivatedProducts: productIdsToDeactivate.length,
      };
    });

    revalidatePath("/admin/termin");
    revalidatePath("/admin/courses");
    revalidatePath("/admin/products");
    revalidatePath("/courses");

    const cascadeSummary = !active
      ? ` ${result.deactivatedCourses} kurser och ${result.deactivatedProducts} produkter avaktiverades automatiskt.`
      : "";

    return {
      success: true,
      msg: `Terminen "${result.termin.name}" är nu ${active ? "aktiv" : "inaktiv"}.${cascadeSummary}`,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte uppdatera terminen." };
  }
}
