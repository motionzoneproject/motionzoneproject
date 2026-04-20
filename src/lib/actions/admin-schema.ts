"use server";

import { revalidatePath } from "next/cache";
import type z from "zod";
import type {
  Course,
  Lesson,
  Prisma,
  SchemaItem,
  Weekday,
} from "@/generated/prisma/client";
import { adminAddCourseToSchemaSchema } from "@/validations/adminforms";
import prisma from "../prisma";
import { formToDbDate } from "../time-convert";
import { isAdminRole } from "./admin-shared";
import { handleClips } from "./purchase-actions";

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

/**
 * Creating lessons bases on a schemaItem.
 * @returns Success (boolean) and a message.
 */
export async function createLessons(
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
