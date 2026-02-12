"use server";

import { revalidatePath } from "next/cache";
import type z from "zod";
import type {
  Course,
  Prisma,
  Product,
  SchemaItem,
  Termin,
  Weekday,
} from "@/generated/prisma/client";
import {
  AdminAddUserInLessonSchema,
  AdminProductCourseItemSchema,
  adminAddCourseSchema,
  adminAddCourseToSchemaSchema,
  adminAddProductSchema,
  adminAddTerminSchema,
  adminLessonFormSchema,
} from "@/validations/adminforms";
import prisma from "../prisma";

import { formToDbDate } from "../time-convert";
import { handleClips } from "./purchase-actions";
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
export type SchemaItemWithCourse = SchemaItem & { course: Course };

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
    include: { course: true },
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
    return { success: false, msg: JSON.stringify(e) };
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
      // 1. Uppdatera själva terminen
      const updatedTermin = await tx.termin.update({
        where: { id },
        data: {
          name: validated.name,
          startDate: newStartDate,
          endDate: newEndDate,
        },
      });

      // 2. Hantera bokningar som hamnar utanför de nya datumen (Återbetalning).
      const affectedBookings = await tx.booking.findMany({
        where: {
          lesson: {
            terminId: id,
            OR: [
              { startTime: { lt: newStartDate } },
              { startTime: { gt: newEndDate } },
            ],
          },
        },
        select: { id: true, purchaseItemId: true },
      });

      for (const booking of affectedBookings) {
        if (!booking.purchaseItemId) continue;

        // Ge tillbaka klipp via handleClips:
        const clipResult = await handleClips(tx, booking.purchaseItemId, 1);

        if (!clipResult.success) {
          throw new Error(clipResult.msg || "Clip update failed.");
        }
      }

      // 3. Hämta alla schemaItems för att synka lektioner
      const schemaItems = await tx.schemaItem.findMany({
        where: { terminId: id },
        include: {
          course: true,
          Lessons: true,
        },
      });

      // 4. Städa bort lektioner som nu ligger utanför intervallet
      // (Bokningarna raderas här pga Cascade Delete, klippen är redan återställda ovan).
      await tx.lesson.deleteMany({
        where: {
          terminId: id,
          OR: [
            { startTime: { lt: newStartDate } },
            { startTime: { gt: newEndDate } },
          ],
        },
      });

      // 5. Skapa nya lektioner för de datum som tillkommit
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
        const currentDate = new Date(newStartDate.getTime());

        const startHours = item.timeStart.getHours();
        const startMinutes = item.timeStart.getMinutes();
        const endHours = item.timeEnd.getHours();
        const endMinutes = item.timeEnd.getMinutes();

        while (currentDate <= newEndDate) {
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
                maxBookings: item.maxBookings,
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
    return { success: false, msg: "Ett fel uppstod vid uppdatering." };
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

    const newSchemaItem = await prisma.schemaItem.create({
      data: {
        terminId,
        place: validated.place,
        courseId: validated.courseId,
        maxBookings: getCourse?.maxBookings,
        timeStart: formToDbDate(validated.timeStart),
        timeEnd: formToDbDate(validated.timeEnd),
        weekday: validated.day as Weekday,
      },
      include: { course: true, termin: true },
    });

    // SKapa lessons!
    const lessons = await createLessons(newSchemaItem.id);

    if (!lessons.success) {
      const del = await prisma.schemaItem.delete({
        where: { id: newSchemaItem.id },
      });
      if (!del)
        throw new Error(
          "SchemaItem was created, but could not create lessons, and could not delete the schemaItem. Empty schemaItem can be in the db.",
        );

      throw new Error(
        "Inga lektioner kunde skapas inom denna termin. Kontrollera startDate och endDate så de täcker bokningsbara dagar.",
      );
    }

    return {
      success: true,
      msg: `Kursen ${newSchemaItem.course.name} lades till i terminen ${newSchemaItem.termin.name}. ${lessons.msg}`,
    };
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
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
      msg: `Kunde inte radera kursen. ${JSON.stringify(e)}`,
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
        maxBookings: validated.maxbookings,
        maxCustomer: validated.maxCustomers,
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
    return { success: false, msg: JSON.stringify(e) };
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

    // Kolla hur många som redan har kursen via ett köp
    const currentSubscribers = await prisma.purchaseItem.count({
      where: { courseId: id },
    });

    // Om admin försöker sänka taket under antalet nuvarande kunder
    if (validated.maxCustomers < currentSubscribers) {
      return {
        success: false,
        msg: `Kan inte sänka max antal kunder till ${validated.maxCustomers}. Det finns redan ${currentSubscribers} kunder som äger kursen.`,
      };
    }

    const newCourseItem = await prisma.course.update({
      data: {
        name: validated.name,
        maxBookings: validated.maxbookings,
        maxCustomer: validated.maxCustomers,
        minAge: validated.minAge,
        maxAge: validated.maxAge,
        level: validated.level,
        adult: validated.adult,
        description: validated.description,
        teacherId: validated.teacherid, // Om en lärare går in nu och ändrar en kurs, blir han lärare. fix.
      },
      where: { id: id },
    });
    return {
      success: true,
      msg: `Kursen ${newCourseItem.name} ändrades.`,
    };
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
  }
}

// *

/**
 * Creating lessons bases on a schemaItem.
 * @returns Success (boolean) and a message.
 */
async function createLessons(
  schemaItemId: string,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    // Hämtar all data vi behöver.

    // Behöver vi validatera någonting här? ev. fix.

    const schemaItm = await prisma.schemaItem.findUnique({
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

    const startDate = schemaItm.termin.startDate;
    const endDate = schemaItm.termin.endDate;
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
          maxBookings: schemaItm.maxBookings,
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

    // 1. Definiera de operationer som ska ingå i transaktionen
    const creationOperation = prisma.lesson.createMany({
      data: lessonsToCreate,
      skipDuplicates: true,
    });

    const [result] = await prisma.$transaction([creationOperation]);

    return {
      success: true,
      msg: `Successfully created ${result.count} lessons.`,
    };
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
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

    // 1. Hämta nuvarande status innan vi ändrar något
    const currentLesson = await prisma.lesson.findUnique({
      where: { id: validated.id },
      include: { bookings: true },
    });

    if (!currentLesson) return { success: false, msg: "Lesson not found." };

    await prisma.$transaction(async (tx) => {
      // 2. Kolla om vi ställer in lektionen NU (från false till true)
      if (!currentLesson.cancelled && validated.cancelled) {
        for (const booking of currentLesson.bookings) {
          // Via rätt nu:
          const clipResult = await handleClips(tx, booking.purchaseItemId, 1);
          if (!clipResult.success) {
            throw new Error(clipResult.msg || "Clip update failed.");
          }
        }
      }
      // 3. Kolla om vi aktiverar en inställd lektion igen (från true till false)
      else if (currentLesson.cancelled && !validated.cancelled) {
        for (const booking of currentLesson.bookings) {
          // Via rätt nu:
          const clipResult = await handleClips(tx, booking.purchaseItemId, -1);
          if (!clipResult.success) {
            throw new Error(clipResult.msg || "Clip update failed.");
          }
        }
      }

      // 4. Uppdatera själva lektionen och bokningarna
      await tx.lesson.update({
        where: { id: validated.id },
        data: {
          message: validated.message,
          cancelled: validated.cancelled,
        },
      });

      await tx.booking.updateMany({
        where: { lessonId: validated.id },
        data: { cancelled: validated.cancelled },
      });
    });

    revalidatePath("/admin/courses");

    return {
      success: true,
      msg: "Lektionen och klipp-saldon har uppdaterats.",
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
};

/**
 * Creates a new product.
 * @returns success (boolean) and a msg.
 * @auth Admin
 */
export async function addNewProduct(
  formData: z.output<typeof adminAddProductSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminAddProductSchema.parseAsync(formData);

    const newProd = await prisma.product.create({
      data: {
        name: validated.name,
        description: validated.description,
        price: validated.price,
        maxCustomer: validated.maxCustomers,
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
    return { success: false, msg: JSON.stringify(e) };
  }
}

/**
 * Edits a product.
 * @returns success (boolean) and a msg.
 * @auth Admin
 */
export async function editProduct(
  id: string,
  formData: z.output<typeof adminAddProductSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminAddProductSchema.parseAsync(formData);

    // kolla så vi inte sänker för lågt. och får minus i plats kvar osv.
    const salesCount = await prisma.purchase.count({
      where: { productId: id },
    });
    if (validated.maxCustomers < salesCount) {
      return {
        success: false,
        msg: "Kan inte sänka maxantalet under redan sålt antal.",
      };
    }

    const newProd = await prisma.product.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description,
        price: validated.price,
        maxCustomer: validated.maxCustomers,
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
    return { success: false, msg: JSON.stringify(e) };
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
    return { success: false, msg: JSON.stringify(e) };
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
              productType === "CLIP" ? 0 : validated.lessonsIncluded,
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
              productType === "CLIP" ? 0 : validated.lessonsIncluded,
          },
        });
      });

      return {
        success: true,
        msg: `Kursen lades in i produkten.`,
      };
    }
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
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
    return { success: false, msg: JSON.stringify(e) };
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

/**
 * Gets all users that have purchased products containing a specific course.
 * @param courseId The course to filter by.
 * @returns Array of users with their purchases for that course.
 * @auth Admin
 */
export async function getUsersWithPurchasedProductsWithCourseInIt(
  courseId: string,
): Promise<{ users: UserPurchasesForCourse[] }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { users: [] };

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
            type: true,
            remainingCount: true,
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

    return { users };
  } catch (e) {
    console.error("Error fetching users with purchases:", e);
    return { users: [] };
  }
}

/**
 * Admin function to add a user to a lesson (create a booking).
 * @param formData Contains userId, purchaseItemId, and lessonId.
 * @returns Success status and message.
 * @auth Admin
 */
export async function addUserInLesson(
  formData: z.output<typeof AdminAddUserInLessonSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "Ingen behörighet." };

  try {
    const validated = await AdminAddUserInLessonSchema.parseAsync(formData);

    // 1. Hämta PurchaseItem inkl. huvud-Purchase för att se saldotyp och ägare
    const pItem = await prisma.purchaseItem.findUnique({
      where: { id: validated.purchaseItemId },
      include: { purchase: true },
    });

    if (!pItem) return { success: false, msg: "Kunde inte hitta köpet." };

    // 2. Kontrollera om användaren redan är bokad på lektionen
    const existingBooking = await prisma.booking.findFirst({
      where: {
        lessonId: validated.lessonId,
        userId: validated.userId,
      },
    });

    if (existingBooking) {
      return {
        success: false,
        msg: "Användaren är redan bokad på denna lektion.",
      };
    }

    // 3. Kolla status på lektionen
    const lesson = await prisma.lesson.findUnique({
      where: { id: validated.lessonId },
      select: { cancelled: true },
    });

    if (!lesson || lesson.cancelled) {
      return {
        success: false,
        msg: "Lektionen är inställd eller hittades inte.",
      };
    }

    // 4. Utför bokning och saldo-dragning i en transaktion
    await prisma.$transaction(async (tx) => {
      // Skapa bokningen
      await tx.booking.create({
        data: {
          lessonId: validated.lessonId,
          userId: validated.userId,
          purchaseItemId: pItem.id,
        },
      });

      // Dra av saldo via handleClips
      const clipResult = await handleClips(tx, pItem.id, -1);

      if (!clipResult.success) {
        throw new Error(clipResult.msg || "Kunde inte uppdatera saldo.");
      }
    });

    revalidatePath("/admin/courses");

    return { success: true, msg: "Användaren är nu inbokad på lektionen!" };
  } catch (e) {
    console.error("Fel vid admin-bokning:", e);
    return { success: false, msg: "Ett tekniskt fel uppstod vid bokningen." };
  }
}

/**
 * Admin function to remove a user from a lesson and restore their clips.
 * @param userId The user to remove.
 * @param lessonId The lesson to remove them from.
 * @returns Success status and message.
 * @auth Admin
 */
export async function removeUserFromLesson(
  userId: string,
  lessonId: string,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "Ingen behörighet." };

  try {
    // 1. Hitta bokningen
    const booking = await prisma.booking.findFirst({
      where: {
        userId: userId,
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

    revalidatePath("/admin/courses");

    return { success: true, msg: "Bokningen har tagits bort." };
  } catch (e) {
    console.error("Fel vid borttagning av bokning:", e);
    return { success: false, msg: "Ett tekniskt fel uppstod." };
  }
}
