"use server";

// big fix! Måste uppdatera ALLA funktioner som har med produkter, bokningar, purschases att göra, för att få till klippkort, så det dras rätt, samt hur det kollas (har lagt in TYPE för det som skall anävndas istället för useTotalCount i purchase-nivå).
// Har förslag sparade från AI hur det borde se ut, men det var också innan TYPE lades in i schemat.Blir det första jag fixar, nu funkar det för bara kurser.

import type { User } from "better-auth";
import { revalidatePath } from "next/cache";
import type z from "zod";
import type {
  Booking,
  Course,
  Lesson,
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
import { getSessionData } from "./sessiondata";

// Lika bra att exportera denna tänker jag.
export async function isAdminRole(): Promise<boolean> {
  const sessiondata = await getSessionData();

  return sessiondata?.user.role === "admin";
}

// Inser att det är svengelska. Men men.
export async function getTermin(): Promise<Termin[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  const terminer = await prisma.termin.findMany({
    orderBy: { startDate: "asc" },
  });
  return terminer;
}

export type SchemaItemWithCourse = SchemaItem & { course: Course };

export type LessonWithBookings = Lesson & { bookings: Booking[] };

export type CourseWithTeacher = Course & { teacher: User };

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

export async function getAllCourses(): Promise<CourseWithTeacher[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  const courses = await prisma.course.findMany({
    include: { teacher: true },
    orderBy: { name: "asc" },
  });
  return courses;
}

export async function addNewTermin(
  formData: z.infer<typeof adminAddTerminSchema>,
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminAddTerminSchema.parseAsync(formData);

    const newSchemaItem = await prisma.termin.create({
      data: {
        name: validated.name,
        startDate: new Date(validated.startDate), // fix: Validate first as date.
        endDate: new Date(validated.endDate), // fix: Validate first as date.
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

      // 2. Hantera bokningar som hamnar utanför de nya datumen (Återbetalning)
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

      // Ge tillbaka klipp till alla drabbade elever
      for (const booking of affectedBookings) {
        await tx.purchaseItem.update({
          where: { id: booking.purchaseItemId },
          data: { remainingCount: { increment: 1 } },
        });
      }

      // 3. Hämta alla mallar (schemaItems) för att synka lektioner
      const schemaItems = await tx.schemaItem.findMany({
        where: { terminId: id },
        include: {
          course: true,
          Lessons: true, // Se till att detta matchar ditt relationsnamn (Lessons/Lesson)
        },
      });

      // 4. Städa bort lektioner som nu ligger utanför intervallet
      // (Bokningarna raderas här pga Cascade Delete, klippen är redan återställda ovan)
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
      msg: `Terminen "${result.name}" har uppdaterats. Eventuella bokningar utanför perioden har raderats och klipp har återställts till eleverna.`,
    };
  } catch (e) {
    console.error("Fel vid editTermin:", e);
    return { success: false, msg: "Ett fel uppstod vid uppdatering." };
  }
}

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
        weekday: validated.day as Weekday, // Jag vågar sätta as Weekday här eftersom zod-schemat validerat det. Men kanske behövs en fix?
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

export async function delSchemaItem(
  id: string,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    // Behöver vi validera id med zod? ev. fix.
    const del = await prisma.schemaItem.delete({
      where: { id },
      select: { course: true },
    });

    if (del) {
      return {
        success: true,
        msg: `${del.course.name} togs bort från veckoschemat.`,
      };
    } else {
      return { success: false, msg: `${id} not found.` };
    }
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
  }
}

export async function delTermin(
  id: string,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    // Behöver vi validera id med zod? ev. fix.
    const del = await prisma.termin.delete({ where: { id } });

    if (del) {
      return { success: true, msg: `Terminen ${del.name} togs bort.` };
    } else {
      return { success: false, msg: `${id} not found.` };
    }
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
  }
}

export async function delCourse(
  id: string,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    // Behöver vi validera id med zod? ev. fix.

    const del = await prisma.course.delete({ where: { id } });

    if (del) {
      return { success: true, msg: `Kursen ${del.name} togs bort.` };
    } else {
      return { success: false, msg: `${id} not found.` };
    }
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
  }
}

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

    // console.log(
    //   "Lektioner att skapa: \n" +
    //     "targetDay: " +
    //     targetDay +
    //     "\n startDate:" +
    //     startDate +
    //     "\n endDate:" +
    //     endDate +
    //     "\n\n\n Lessons:\n" +
    //     JSON.stringify(lessonsToCreate)
    // );

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
          await tx.purchaseItem.update({
            where: { id: booking.purchaseItemId },
            data: { remainingCount: { increment: 1 } },
          });
        }
      }
      // 3. Kolla om vi aktiverar en inställd lektion igen (från true till false)
      else if (currentLesson.cancelled && !validated.cancelled) {
        for (const booking of currentLesson.bookings) {
          await tx.purchaseItem.update({
            where: { id: booking.purchaseItemId },
            data: { remainingCount: { decrement: 1 } },
          });
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

//ev, får se vad som behövs: export type ProductWithCourses = Product & { courses: Course[] };

export type ProductWithNumberPrice = Omit<Product, "price"> & { price: number };

export async function getAllProducts(): Promise<Product[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });

  return products;
}

export type ProdCourse = {
  course: Course;
} & {
  courseId: string;
  productId: string;
  lessonsIncluded: number;
};

export async function addNewProduct(
  formData: z.output<typeof adminAddProductSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminAddProductSchema.parseAsync(formData);
    // fix:
    const newProd = await prisma.product.create({
      data: {
        name: validated.name,
        description: validated.description,
        price: validated.price,
        maxCustomer: validated.maxCustomers,
        useTotalCount: validated.clipcard,
        totalCount: validated.clipCount,
      },
    });
    return {
      success: true,
      msg: `Produkten ${newProd.name} skapades.`, // fix
    };
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
  }
}

export async function editProduct(
  id: string,
  formData: z.output<typeof adminAddProductSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminAddProductSchema.parseAsync(formData);
    // fix:
    const newProd = await prisma.product.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description,
        price: validated.price,
        useTotalCount: validated.clipcard, // fix: har lagt till type i db istället.
        maxCustomer: validated.maxCustomers,
        totalCount: validated.clipCount,
      },
    });
    return {
      success: true,
      msg: `Produkten ${newProd.name} ändrades.`, // fix
    };
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
  }
}

export async function removeProduct(
  id: string,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    // fix:
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

export async function addCourseToProduct(
  formData: z.output<typeof AdminProductCourseItemSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  // try {
  const validated = await AdminProductCourseItemSchema.parseAsync(formData);

  const isInProd = await isCourseInProduct(
    formData.courseId,
    formData.productId,
  );

  if (isInProd.found) {
    await prisma.productOnCourse.update({
      where: {
        courseId_productId: {
          courseId: validated.courseId,
          productId: validated.productId,
        },
      },
      data: {
        lessonsIncluded: validated.lessonsIncluded,
      },
    });

    return {
      success: true,
      msg: `Kursen ändrades i produkten.`, // fix
    };
  } else {
    await prisma.productOnCourse.create({
      data: {
        productId: validated.productId,
        courseId: validated.courseId,
        lessonsIncluded: validated.lessonsIncluded,
      },
    });

    return {
      success: true,
      msg: `Kursen lades in i produkten.`, // fix
    };
  }
  // } catch (e) {
  //   return { success: false, msg: JSON.stringify(e) };
  // }
}

export async function removeCourseInProduct(
  formData: z.output<typeof AdminProductCourseItemSchema>,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await AdminProductCourseItemSchema.parseAsync(formData);

    await prisma.productOnCourse.delete({
      where: {
        courseId_productId: {
          productId: validated.productId,
          courseId: validated.courseId,
        },
      },
    });
    return {
      success: true,
      msg: `Kursen togs bort i produkten.`, // fix
    };
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
  }
}

export async function isCourseInProduct(
  courseId: string,
  productId: string,
): Promise<{ found: boolean; lessonsIncluded?: number }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { found: false };

  try {
    const found = await prisma.productOnCourse.findUnique({
      where: { courseId_productId: { courseId, productId } },
    });

    if (found) return { found: true, lessonsIncluded: found.lessonsIncluded };
    return { found: false };
  } catch (e) {
    console.error(e);
    return { found: false };
  }
}

export async function countOrderItems(
  productId: string,
): Promise<{ found: boolean; count?: number }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { found: false };
  try {
    const count = await prisma.orderItem.count({
      where: { productId: productId },
    });
    // Vi returnerar success: true även om count är 0
    return { found: true, count };
  } catch (e) {
    console.error(e);
    return { found: false, count: 0 };
  }
}

export async function countOrderItemsAndProductsCourse(
  courseId: string,
): Promise<{ found: boolean; count?: number; countProd?: number }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { found: false };
  try {
    const count = await prisma.orderItem.count({
      where: { product: { courses: { some: { courseId } } } },
    });

    const countProd = await prisma.product.count({
      where: { courses: { some: { courseId } } },
    });
    // Vi returnerar success: true även om count är 0
    return { found: true, count, countProd };
  } catch (e) {
    console.error(e);
    return { found: false };
  }
}

export async function getTeacher(userId: string) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { found: false };
  try {
    const teacher = await prisma.user.findUnique({
      where: { id: userId },
    });

    return { found: true, teacher: teacher };
  } catch (e) {
    console.error(e);
    return { found: false };
  }
}

export type UserPurchasesForCourse = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    purchases: {
      select: {
        id: true;
        product: { select: { id: true; name: true } };
        PurchaseItems: {
          select: { id: true; remainingCount: true; unlimited: true };
        };
      };
    };
  };
}>;

export async function getUsersWithPurchasedProductsWithCourseInIt(
  courseId: string,
): Promise<{
  success: boolean;
  msg?: string;
  users?: UserPurchasesForCourse[];
}> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };
  try {
    const usersWithData = await prisma.user.findMany({
      where: {
        purchases: {
          some: {
            PurchaseItems: {
              some: { courseId: courseId, remainingCount: { gt: 0 } },
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
              some: { courseId, remainingCount: { gt: 0 } },
            },
          },
          select: {
            id: true,
            product: {
              select: { id: true, name: true }, // Vi skippar price här!
            },
            PurchaseItems: {
              where: { courseId, remainingCount: { gt: 0 } },
              select: {
                id: true,
                remainingCount: true,
                unlimited: true,
              },
            },
          },
        },
      },
    });

    if (!usersWithData) {
      return { success: false, msg: "Användaren hittades inte." };
    }

    return {
      success: true,
      msg: "Hämtade användare och giltiga köp.",
      users: usersWithData,
    };
  } catch (e) {
    console.error(e);
    return { success: false };
  }
}

export async function addUserInLesson(
  formData: z.output<typeof AdminAddUserInLessonSchema>,
): Promise<{ success: boolean; msg?: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };
  try {
    const validated = await AdminAddUserInLessonSchema.parseAsync(formData);

    const purchase = await prisma.purchaseItem.findUnique({
      where: { id: validated.purchaseId },
    });

    if (!purchase)
      return { success: false, msg: "Could not find the purchase" };

    if (purchase.remainingCount === 0)
      return { success: false, msg: "No remaining count." };

    const existingBooking = await prisma.booking.findFirst({
      where: {
        lessonId: validated.lessonId,
        userId: validated.userId,
        purchaseItemId: purchase.id,
      },
    });

    if (existingBooking) {
      return {
        success: false,
        msg: "Eleven är redan registrerad på denna lektion.",
      };
    }

    // KOLLA STATUS PÅ LEKTIONEN
    const lesson = await prisma.lesson.findUnique({
      where: { id: validated.lessonId },
      select: { cancelled: true },
    });

    if (lesson?.cancelled) {
      return {
        success: false,
        msg: "Kan inte lägga till elever i en inställd lektion.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.booking.create({
        data: {
          lessonId: validated.lessonId,
          userId: validated.userId,
          purchaseItemId: purchase.id,
        },
      });

      const updatedItem = await tx.purchaseItem.update({
        where: {
          id: validated.purchaseId,
          remainingCount: { gt: 0 }, // Uppdatera ENDAST om det finns klipp kvar
        },
        data: {
          remainingCount: { decrement: 1 },
        },
      });

      console.log("Nytt saldo i databasen:", updatedItem.remainingCount);
    });

    revalidatePath("/admin/courses"); // Sökvägen där komponenten bor

    return { success: true, msg: "Eleven blev tillagd i lektionen." };
  } catch (e) {
    console.error(e);
    return { success: false };
  }
}
export async function removeUserFromLesson(
  userId: string,
  lessonId: string,
): Promise<{ success: boolean; msg?: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    // KOLLA STATUS PÅ LEKTIONEN
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { cancelled: true },
    });

    if (lesson?.cancelled) {
      return {
        success: false,
        msg: "Kan inte ta bort elev i en inställd lektion. Eleven har redan fått tillbaka sin bokning.",
      };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Hitta bokningen baserat på användare och lektion
      const booking = await tx.booking.findFirst({
        where: {
          userId: userId,
          lessonId: lessonId,
        },
        select: { id: true, purchaseItemId: true },
      });

      if (!booking) {
        throw new Error(
          "Ingen bokning hittades för denna användare på denna lektion.",
        );
      }

      // 2. Ta bort bokningen med dess unika ID
      await tx.booking.delete({
        where: { id: booking.id },
      });

      // 3. Ge tillbaka klippet på rätt köp
      await tx.purchaseItem.update({
        where: { id: booking.purchaseItemId },
        data: { remainingCount: { increment: 1 } },
      });
    });

    revalidatePath("/admin/courses");
    return { success: true, msg: "Närvaro borttagen och klipp återställt." };
  } catch (e) {
    console.error("Fel vid borttagning av närvaro:", e);
    return { success: false, msg: "Kunde inte ta bort närvaro." };
  }
}

// All of these functions are fixed with ai for also handling clipcard. So i will keep this as commented code, and fix this later.
// "use server";

// import type { User } from "better-auth";
// import { revalidatePath } from "next/cache";
// import type z from "zod";
// import type {
//   Booking,
//   Course,
//   Lesson,
//   Prisma,
//   Product,
//   SchemaItem,
//   Termin,
//   Weekday,
// } from "@/generated/prisma/client";
// import {
//   AdminAddUserInLessonSchema,
//   AdminProductCourseItemSchema,
//   adminAddCourseSchema,
//   adminAddCourseToSchemaSchema,
//   adminAddProductSchema,
//   adminAddTerminSchema,
//   adminLessonFormSchema,
// } from "@/validations/adminforms";
// import prisma from "../prisma";
// import { formToDbDate } from "../time-convert";
// import { getSessionData } from "./sessiondata";

// // Lika bra att exportera denna tänker jag.
// export async function isAdminRole(): Promise<boolean> {
//   const sessiondata = await getSessionData();

//   return sessiondata?.user.role === "admin";
// }

// // Inser att det är svengelska. Men men.
// export async function getTermin(): Promise<Termin[]> {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return [];

//   // Behövs mer säkerhet än såhär?

//   const terminer = await prisma.termin.findMany({
//     orderBy: { startDate: "asc" },
//   });
//   return terminer;
// }

// export type SchemaItemWithCourse = SchemaItem & { course: Course };

// export type LessonWithBookings = Lesson & { bookings: Booking[] };

// export type CourseWithTeacher = Course & { teacher: User };

// export async function getSchemaItems(
//   terminId: string,
// ): Promise<SchemaItemWithCourse[]> {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return [];

//   const schemaItems = await prisma.schemaItem.findMany({
//     where: { terminId },
//     include: { course: true },
//   });
//   return schemaItems;
// }

// export async function getAllCourses(): Promise<CourseWithTeacher[]> {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return [];

//   const courses = await prisma.course.findMany({
//     include: { teacher: true },
//     orderBy: { name: "asc" },
//   });
//   return courses;
// }

// export async function addNewTermin(
//   formData: z.infer<typeof adminAddTerminSchema>,
// ) {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return { success: false, msg: "No permission." };

//   try {
//     const validated = await adminAddTerminSchema.parseAsync(formData);

//     const newSchemaItem = await prisma.termin.create({
//       data: {
//         name: validated.name,
//         startDate: new Date(validated.startDate), // fix: Validate first as date.
//         endDate: new Date(validated.endDate), // fix: Validate first as date.
//       },
//     });
//     return {
//       success: true,
//       msg: `Terminen ${newSchemaItem.name} skapades.`,
//     };
//   } catch (e) {
//     return { success: false, msg: JSON.stringify(e) };
//   }
// }

// export async function checkTerminDateChange(
//   terminId: string,
//   newStart: Date,
//   newEnd: Date,
// ) {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return { count: 0 };

//   const affectedBookings = await prisma.booking.count({
//     where: {
//       lesson: {
//         terminId: terminId,
//         OR: [{ startTime: { lt: newStart } }, { startTime: { gt: newEnd } }],
//       },
//     },
//   });

//   return { count: affectedBookings };
// }

// export async function editTermin(
//   id: string,
//   formData: z.infer<typeof adminAddTerminSchema>,
// ) {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return { success: false, msg: "No permission." };

//   try {
//     const validated = await adminAddTerminSchema.parseAsync(formData);
//     const newStartDate = new Date(validated.startDate);
//     const newEndDate = new Date(validated.endDate);

//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Uppdatera själva terminen
//       const updatedTermin = await tx.termin.update({
//         where: { id },
//         data: {
//           name: validated.name,
//           startDate: newStartDate,
//           endDate: newEndDate,
//         },
//       });

//       // 2. Hantera bokningar som hamnar utanför de nya datumen (Återbetalning)
//       const affectedBookings = await tx.booking.findMany({
//         where: {
//           lesson: {
//             terminId: id,
//             OR: [
//               { startTime: { lt: newStartDate } },
//               { startTime: { gt: newEndDate } },
//             ],
//           },
//         },
//         include: {
//           purchaseItem: {
//             include: { purchase: true },
//           },
//         },
//       });

//       // Ge tillbaka klipp till alla drabbade elever på rätt nivå
//       for (const booking of affectedBookings) {
//         const purchase = booking.purchaseItem.purchase;

//         if (purchase.useTotalCount) {
//           // Återställ till Klippkortet
//           await tx.purchase.update({
//             where: { id: purchase.id },
//             data: { remainingCount: { increment: 1 } },
//           });
//         } else {
//           // Återställ till den specifika kursen (PurchaseItem)
//           await tx.purchaseItem.update({
//             where: { id: booking.purchaseItemId },
//             data: { remainingCount: { increment: 1 } },
//           });
//         }
//       }

//       // 3. Hämta alla mallar (schemaItems) för att synka lektioner
//       const schemaItems = await tx.schemaItem.findMany({
//         where: { terminId: id },
//         include: {
//           course: true,
//           Lessons: true,
//         },
//       });

//       // 4. Städa bort lektioner som nu ligger utanför intervallet
//       await tx.lesson.deleteMany({
//         where: {
//           terminId: id,
//           OR: [
//             { startTime: { lt: newStartDate } },
//             { startTime: { gt: newEndDate } },
//           ],
//         },
//       });

//       // 5. Skapa nya lektioner för de datum som tillkommit
//       const WEEKDAY_MAP: Record<string, number> = {
//         MONDAY: 1,
//         TUESDAY: 2,
//         WEDNESDAY: 3,
//         THURSDAY: 4,
//         FRIDAY: 5,
//         SATURDAY: 6,
//         SUNDAY: 0,
//       };

//       const lessonsToCreate = [];

//       for (const item of schemaItems) {
//         const targetDay = WEEKDAY_MAP[item.weekday];
//         const currentDate = new Date(newStartDate.getTime());

//         const startHours = item.timeStart.getHours();
//         const startMinutes = item.timeStart.getMinutes();
//         const endHours = item.timeEnd.getHours();
//         const endMinutes = item.timeEnd.getMinutes();

//         while (currentDate <= newEndDate) {
//           currentDate.setHours(0, 0, 0, 0);

//           if (currentDate.getDay() === targetDay) {
//             const combinedStartTime = new Date(currentDate.getTime());
//             combinedStartTime.setHours(startHours, startMinutes, 0, 0);

//             // Kolla om lektionen redan finns (så vi inte skapar dubbletter)
//             const exists = item.Lessons.some(
//               (l) => l.startTime.getTime() === combinedStartTime.getTime(),
//             );

//             if (!exists) {
//               const combinedEndTime = new Date(currentDate.getTime());
//               combinedEndTime.setHours(endHours, endMinutes, 0, 0);

//               lessonsToCreate.push({
//                 startTime: combinedStartTime,
//                 endTime: combinedEndTime,
//                 terminId: id,
//                 courseId: item.courseId,
//                 teacherId: item.course.teacherId,
//                 maxBookings: item.maxBookings,
//                 schemaItemId: item.id,
//               });
//             }
//           }
//           currentDate.setDate(currentDate.getDate() + 1);
//         }
//       }

//       if (lessonsToCreate.length > 0) {
//         await tx.lesson.createMany({
//           data: lessonsToCreate,
//         });
//       }

//       return updatedTermin;
//     });

//     revalidatePath("/admin/courses");
//     return {
//       success: true,
//       msg: `Terminen "${result.name}" har uppdaterats. Bokningar utanför perioden har raderats och saldon har återställts korrekt.`,
//     };
//   } catch (e) {
//     console.error("Fel vid editTermin:", e);
//     return { success: false, msg: "Ett fel uppstod vid uppdatering." };
//   }
// }

// export async function addCoursetoSchema(
//   terminId: string,
//   formData: z.infer<typeof adminAddCourseToSchemaSchema>,
// ): Promise<{
//   success: boolean;
//   msg: string;
// }> {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return { success: false, msg: "No permission." };

//   try {
//     const validated = await adminAddCourseToSchemaSchema.parseAsync(formData);

//     const getCourse = await prisma.course.findUnique({
//       where: { id: validated.courseId },
//     });

//     if (!getCourse) throw new Error("Course was not found.");

//     const newSchemaItem = await prisma.schemaItem.create({
//       data: {
//         terminId,
//         place: validated.place,
//         courseId: validated.courseId,
//         maxBookings: getCourse?.maxBookings,
//         timeStart: formToDbDate(validated.timeStart),
//         timeEnd: formToDbDate(validated.timeEnd),
//         weekday: validated.day as Weekday, // Jag vågar sätta as Weekday här eftersom zod-schemat validerat det. Men kanske behövs en fix?
//       },
//       include: { course: true, termin: true },
//     });

//     // SKapa lessons!
//     const lessons = await createLessons(newSchemaItem.id);

//     if (!lessons.success) {
//       const del = await prisma.schemaItem.delete({
//         where: { id: newSchemaItem.id },
//       });
//       if (!del)
//         throw new Error(
//           "SchemaItem was created, but could not create lessons, and could not delete the schemaItem. Empty schemaItem can be in the db.",
//         );

//       throw new Error(
//         "Inga lektioner kunde skapas inom denna termin. Kontrollera startDate och endDate så de täcker bokningsbara dagar.",
//       );
//     }

//     return {
//       success: true,
//       msg: `Kursen ${newSchemaItem.course.name} lades till i terminen ${newSchemaItem.termin.name}. ${lessons.msg}`,
//     };
//   } catch (e) {
//     return { success: false, msg: JSON.stringify(e) };
//   }
// }

// export async function delSchemaItem(
//   id: string,
// ): Promise<{ success: boolean; msg: string }> {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return { success: false, msg: "No permission." };

//   try {
//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Hitta alla bokningar kopplade till lektioner som skapats av detta schemaItem
//       const affectedBookings = await tx.booking.findMany({
//         where: {
//           lesson: { schemaItemId: id },
//         },
//         include: {
//           purchaseItem: {
//             include: { purchase: true },
//           },
//         },
//       });

//       // 2. Återställ klipp/saldon
//       for (const booking of affectedBookings) {
//         const purchase = booking.purchaseItem.purchase;

//         if (purchase.useTotalCount) {
//           // Klippkort
//           await tx.purchase.update({
//             where: { id: purchase.id },
//             data: { remainingCount: { increment: 1 } },
//           });
//         } else {
//           // Kursbundet
//           await tx.purchaseItem.update({
//             where: { id: booking.purchaseItemId },
//             data: { remainingCount: { increment: 1 } },
//           });
//         }
//       }

//       // 3. Radera mallen (schemaItem)
//       // Detta raderar alla lessons och bookings pga Cascade
//       return await tx.schemaItem.delete({
//         where: { id },
//         select: { course: true },
//       });
//     });

//     revalidatePath("/admin/courses");

//     return {
//       success: true,
//       msg: `${result.course.name} togs bort från veckoschemat och klipp har återställts för alla framtida bokningar.`,
//     };
//   } catch (e) {
//     console.error("Fel vid delSchemaItem:", e);
//     return { success: false, msg: "Kunde inte ta bort schemaposten." };
//   }
// }
// export async function delTermin(
//   id: string,
// ): Promise<{ success: boolean; msg: string }> {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return { success: false, msg: "No permission." };

//   try {
//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Hitta alla bokningar kopplade till lektioner i denna termin
//       // Vi inkluderar köpinformation för att veta var vi ska återställa klipp
//       const affectedBookings = await tx.booking.findMany({
//         where: {
//           lesson: { terminId: id },
//         },
//         include: {
//           purchaseItem: {
//             include: { purchase: true },
//           },
//         },
//       });

//       // 2. Ge tillbaka klipp till alla drabbade elever
//       for (const booking of affectedBookings) {
//         const purchase = booking.purchaseItem.purchase;

//         if (purchase.useTotalCount) {
//           // Återställ till klippkortet
//           await tx.purchase.update({
//             where: { id: purchase.id },
//             data: { remainingCount: { increment: 1 } },
//           });
//         } else {
//           // Återställ till den specifika kursen
//           await tx.purchaseItem.update({
//             where: { id: booking.purchaseItemId },
//             data: { remainingCount: { increment: 1 } },
//           });
//         }
//       }

//       // 3. Radera terminen
//       // (Bokningar och lektioner raderas automatiskt om du har onDelete: Cascade)
//       return await tx.termin.delete({
//         where: { id },
//       });
//     });

//     revalidatePath("/admin/courses");
//     return {
//       success: true,
//       msg: `Terminen ${result.name} och alla dess lektioner togs bort. Klipp har återställts till eleverna.`,
//     };
//   } catch (e) {
//     console.error("Fel vid borttagning av termin:", e);
//     return {
//       success: false,
//       msg: "Kunde inte ta bort terminen. Kontrollera om det finns beroenden som hindrar borttagning.",
//     };
//   }
// }

// export async function delCourse(
//   id: string,
// ): Promise<{ success: boolean; msg: string }> {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return { success: false, msg: "No permission." };

//   try {
//     // Behöver vi validera id med zod? ev. fix.

//     const del = await prisma.course.delete({ where: { id } });

//     if (del) {
//       return { success: true, msg: `Kursen ${del.name} togs bort.` };
//     } else {
//       return { success: false, msg: `${id} not found.` };
//     }
//   } catch (e) {
//     return { success: false, msg: JSON.stringify(e) };
//   }
// }

// export async function addNewCourse(
//   formData: z.output<typeof adminAddCourseSchema>,
// ): Promise<{ success: boolean; msg: string }> {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return { success: false, msg: "No permission." };

//   try {
//     const validated = await adminAddCourseSchema.parseAsync(formData);

//     const checkTeacherId = await prisma.user.findUnique({
//       where: { id: validated.teacherid },
//     });

//     if (!(checkTeacherId && checkTeacherId.role === "admin"))
//       throw new Error(
//         `A teacher with id ${validated.teacherid} was not found.`,
//       );

//     const newCourseItem = await prisma.course.create({
//       data: {
//         name: validated.name,
//         maxBookings: validated.maxbookings,
//         maxCustomer: validated.maxCustomers,
//         minAge: validated.minAge,
//         maxAge: validated.maxAge,
//         level: validated.level,
//         adult: validated.adult,
//         description: validated.description,
//         teacherId: validated.teacherid,
//       },
//     });
//     return {
//       success: true,
//       msg: `Kursen ${newCourseItem.name} skapades.`,
//     };
//   } catch (e) {
//     return { success: false, msg: JSON.stringify(e) };
//   }
// }

// export async function editCourse(
//   id: string,
//   formData: z.output<typeof adminAddCourseSchema>,
// ): Promise<{ success: boolean; msg: string }> {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return { success: false, msg: "No permission." };

//   try {
//     const validated = await adminAddCourseSchema.parseAsync(formData);

//     const checkTeacherId = await prisma.user.findUnique({
//       where: { id: validated.teacherid },
//     });

//     if (!(checkTeacherId && checkTeacherId.role === "admin"))
//       throw new Error(
//         `A teacher with id ${validated.teacherid} was not found.`,
//       );

//     const newCourseItem = await prisma.course.update({
//       data: {
//         name: validated.name,
//         maxBookings: validated.maxbookings,
//         maxCustomer: validated.maxCustomers,
//         minAge: validated.minAge,
//         maxAge: validated.maxAge,
//         level: validated.level,
//         adult: validated.adult,
//         description: validated.description,
//         teacherId: validated.teacherid, // Om en lärare går in nu och ändrar en kurs, blir han lärare. fix.
//       },
//       where: { id: id },
//     });
//     return {
//       success: true,
//       msg: `Kursen ${newCourseItem.name} ändrades.`,
//     };
//   } catch (e) {
//     return { success: false, msg: JSON.stringify(e) };
//   }
// }

// async function createLessons(
//   schemaItemId: string,
// ): Promise<{ success: boolean; msg: string }> {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return { success: false, msg: "No permission." };

//   try {
//     // Hämtar all data vi behöver.

//     // Behöver vi validatera någonting här? ev. fix.

//     const schemaItm = await prisma.schemaItem.findUnique({
//       where: { id: schemaItemId },
//       include: { termin: true, course: true },
//     });

//     if (!schemaItm) throw new Error("schemaItm kunde inte hittas.");

//     const WEEKDAY_MAP: Record<Weekday, number> = {
//       MONDAY: 1,
//       TUESDAY: 2,
//       WEDNESDAY: 3,
//       THURSDAY: 4,
//       FRIDAY: 5,
//       SATURDAY: 6,
//       SUNDAY: 0,
//     };

//     const targetDay = WEEKDAY_MAP[schemaItm?.weekday]; // Få targetday som rätt nummer.

//     const startDate = schemaItm.termin.startDate;
//     const endDate = schemaItm.termin.endDate;
//     const teacherId = schemaItm.course.teacherId;

//     const lessonsToCreate = []; // Dessa lessions ska skapas.

//     const currentDate = new Date(startDate.getTime());
//     const startHours = schemaItm.timeStart.getHours();
//     const startMinutes = schemaItm.timeStart.getMinutes();
//     const endHours = schemaItm.timeEnd.getHours();
//     const endMinutes = schemaItm.timeEnd.getMinutes();

//     /// Så nu loopar vi igenom alla targetdays inom den perioden:

//     while (currentDate <= endDate) {
//       currentDate.setHours(0, 0, 0, 0);

//       // Jämför veckodag (getDay() returnerar 0-6)
//       if (currentDate.getDay() === targetDay) {
//         // Skapa startTime: Kombinera matchande datum med tidskomponenten
//         const combinedStartTime = new Date(currentDate.getTime());
//         combinedStartTime.setHours(startHours, startMinutes, 0, 0); // Sätt tid, nollställ sek/ms

//         // Skapa endTime: Kombinera matchande datum med tidskomponenten
//         const combinedEndTime = new Date(currentDate.getTime());
//         combinedEndTime.setHours(endHours, endMinutes, 0, 0);

//         lessonsToCreate.push({
//           startTime: combinedStartTime,
//           endTime: combinedEndTime,
//           terminId: schemaItm.termin.id,
//           courseId: schemaItm.course.id,
//           teacherId: teacherId,
//           maxBookings: schemaItm.maxBookings,
//           schemaItemId: schemaItm.id, // Denna kopplar Lesson till mallen
//           // message och cancelled får standardvärden/null
//         });
//       }
//       // Gå till nästa dag
//       currentDate.setDate(currentDate.getDate() + 1);
//     }

//     // console.log(
//     //   "Lektioner att skapa: \n" +
//     //     "targetDay: " +
//     //     targetDay +
//     //     "\n startDate:" +
//     //     startDate +
//     //     "\n endDate:" +
//     //     endDate +
//     //     "\n\n\n Lessons:\n" +
//     //     JSON.stringify(lessonsToCreate)
//     // );

//     // Kontrollera om det finns något att skapa
//     if (lessonsToCreate.length === 0) {
//       return {
//         success: false,
//         msg: "No matching days found to create lessons.",
//       };
//     }

//     // 1. Definiera de operationer som ska ingå i transaktionen
//     const creationOperation = prisma.lesson.createMany({
//       data: lessonsToCreate,
//       skipDuplicates: true,
//     });

//     const [result] = await prisma.$transaction([creationOperation]);

//     return {
//       success: true,
//       msg: `Successfully created ${result.count} lessons.`,
//     };
//   } catch (e) {
//     return { success: false, msg: JSON.stringify(e) };
//   }
// }

// export async function editLessonItem(
//   formData: z.output<typeof adminLessonFormSchema>,
// ): Promise<{ success: boolean; msg: string }> {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return { success: false, msg: "No permission." };

//   try {
//     const validated = await adminLessonFormSchema.parseAsync(formData);

//     // 1. Hämta nuvarande status och inkludera allt för att veta var saldot bor
//     const currentLesson = await prisma.lesson.findUnique({
//       where: { id: validated.id },
//       include: {
//         bookings: {
//           include: {
//             purchaseItem: {
//               include: { purchase: true },
//             },
//           },
//         },
//       },
//     });

//     if (!currentLesson) return { success: false, msg: "Lesson not found." };

//     await prisma.$transaction(async (tx) => {
//       // 2. Kolla om vi ställer in lektionen NU (från false till true)
//       if (!currentLesson.cancelled && validated.cancelled) {
//         for (const booking of currentLesson.bookings) {
//           const purchase = booking.purchaseItem.purchase;

//           if (purchase.useTotalCount) {
//             // Återställ till klippkortet
//             await tx.purchase.update({
//               where: { id: purchase.id },
//               data: { remainingCount: { increment: 1 } },
//             });
//           } else {
//             // Återställ till kursraden
//             await tx.purchaseItem.update({
//               where: { id: booking.purchaseItemId },
//               data: { remainingCount: { increment: 1 } },
//             });
//           }
//         }
//       }
//       // 3. Kolla om vi aktiverar en inställd lektion igen (från true till false)
//       else if (currentLesson.cancelled && !validated.cancelled) {
//         for (const booking of currentLesson.bookings) {
//           const purchase = booking.purchaseItem.purchase;

//           if (purchase.useTotalCount) {
//             // Dra från klippkortet igen
//             await tx.purchase.update({
//               where: { id: purchase.id },
//               data: { remainingCount: { decrement: 1 } },
//             });
//           } else {
//             // Dra från kursraden igen
//             await tx.purchaseItem.update({
//               where: { id: booking.purchaseItemId },
//               data: { remainingCount: { decrement: 1 } },
//             });
//           }
//         }
//       }

//       // 4. Uppdatera själva lektionen och bokningarna
//       await tx.lesson.update({
//         where: { id: validated.id },
//         data: {
//           message: validated.message,
//           cancelled: validated.cancelled,
//         },
//       });

//       await tx.booking.updateMany({
//         where: { lessonId: validated.id },
//         data: { cancelled: validated.cancelled },
//       });
//     });

//     revalidatePath("/admin/courses");

//     return {
//       success: true,
//       msg: "Lektionen och klipp-saldon har uppdaterats.",
//     };
//   } catch (e) {
//     console.error(e);
//     return { success: false, msg: "Ett fel uppstod vid uppdatering." };
//   }
// }

// //ev, får se vad som behövs: export type ProductWithCourses = Product & { courses: Course[] };

// export type ProductWithNumberPrice = Omit<Product, "price"> & { price: number };

// export async function getAllProducts(): Promise<Product[]> {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return [];

//   const products = await prisma.product.findMany({ orderBy: { name: "asc" } });

//   return products;
// }

// export type ProdCourse = {
//   course: Course;
// } & {
//   courseId: string;
//   productId: string;
//   lessonsIncluded: number;
// };

// export async function addNewProduct(
//   formData: z.output<typeof adminAddProductSchema>,
// ): Promise<{ success: boolean; msg: string }> {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return { success: false, msg: "No permission." };

//   try {
//     const validated = await adminAddProductSchema.parseAsync(formData);
//     // fix:
//     const newProd = await prisma.product.create({
//       data: {
//         name: validated.name,
//         description: validated.description,
//         price: validated.price,
//         maxCustomer: validated.maxCustomers,
//         useTotalCount: validated.clipcard,
//         totalCount: validated.clipCount,
//       },
//     });
//     return {
//       success: true,
//       msg: `Produkten ${newProd.name} skapades.`, // fix
//     };
//   } catch (e) {
//     return { success: false, msg: JSON.stringify(e) };
//   }
// }

// export async function editProduct(
//   id: string,
//   formData: z.output<typeof adminAddProductSchema>,
// ): Promise<{ success: boolean; msg: string }> {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return { success: false, msg: "No permission." };

//   try {
//     const validated = await adminAddProductSchema.parseAsync(formData);
//     // fix:
//     const newProd = await prisma.product.update({
//       where: { id },
//       data: {
//         name: validated.name,
//         description: validated.description,
//         price: validated.price,
//         useTotalCount: validated.clipcard,
//         maxCustomer: validated.maxCustomers,
//         totalCount: validated.clipCount,
//       },
//     });
//     return {
//       success: true,
//       msg: `Produkten ${newProd.name} ändrades.`, // fix
//     };
//   } catch (e) {
//     return { success: false, msg: JSON.stringify(e) };
//   }
// }

// export async function removeProduct(
//   id: string,
// ): Promise<{ success: boolean; msg: string }> {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return { success: false, msg: "No permission." };

//   try {
//     // fix:
//     const remProd = await prisma.product.delete({
//       where: { id },
//     });
//     return {
//       success: true,
//       msg: `Produkten ${remProd.name} togs bort.`, // fix
//     };
//   } catch (e) {
//     return { success: false, msg: JSON.stringify(e) };
//   }
// }

// export async function addCourseToProduct(
//   formData: z.output<typeof AdminProductCourseItemSchema>,
// ): Promise<{ success: boolean; msg: string }> {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return { success: false, msg: "No permission." };

//   // try {
//   const validated = await AdminProductCourseItemSchema.parseAsync(formData);

//   const isInProd = await isCourseInProduct(
//     formData.courseId,
//     formData.productId,
//   );

//   if (isInProd.found) {
//     await prisma.productOnCourse.update({
//       where: {
//         courseId_productId: {
//           courseId: validated.courseId,
//           productId: validated.productId,
//         },
//       },
//       data: {
//         lessonsIncluded: validated.lessonsIncluded,
//       },
//     });

//     return {
//       success: true,
//       msg: `Kursen ändrades i produkten.`, // fix
//     };
//   } else {
//     await prisma.productOnCourse.create({
//       data: {
//         productId: validated.productId,
//         courseId: validated.courseId,
//         lessonsIncluded: validated.lessonsIncluded,
//       },
//     });

//     return {
//       success: true,
//       msg: `Kursen lades in i produkten.`, // fix
//     };
//   }
//   // } catch (e) {
//   //   return { success: false, msg: JSON.stringify(e) };
//   // }
// }

// export async function removeCourseInProduct(
//   formData: z.output<typeof AdminProductCourseItemSchema>,
// ): Promise<{ success: boolean; msg: string }> {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return { success: false, msg: "No permission." };

//   try {
//     const validated = await AdminProductCourseItemSchema.parseAsync(formData);

//     await prisma.productOnCourse.delete({
//       where: {
//         courseId_productId: {
//           productId: validated.productId,
//           courseId: validated.courseId,
//         },
//       },
//     });
//     return {
//       success: true,
//       msg: `Kursen togs bort i produkten.`, // fix
//     };
//   } catch (e) {
//     return { success: false, msg: JSON.stringify(e) };
//   }
// }

// export async function isCourseInProduct(
//   courseId: string,
//   productId: string,
// ): Promise<{ found: boolean; lessonsIncluded?: number }> {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return { found: false };

//   try {
//     const found = await prisma.productOnCourse.findUnique({
//       where: { courseId_productId: { courseId, productId } },
//     });

//     if (found) return { found: true, lessonsIncluded: found.lessonsIncluded };
//     return { found: false };
//   } catch (e) {
//     console.error(e);
//     return { found: false };
//   }
// }

// export async function countOrderItems(
//   productId: string,
// ): Promise<{ found: boolean; count?: number }> {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return { found: false };
//   try {
//     const count = await prisma.orderItem.count({
//       where: { productId: productId },
//     });
//     // Vi returnerar success: true även om count är 0
//     return { found: true, count };
//   } catch (e) {
//     console.error(e);
//     return { found: false, count: 0 };
//   }
// }

// export async function countOrderItemsAndProductsCourse(
//   courseId: string,
// ): Promise<{ found: boolean; count?: number; countProd?: number }> {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return { found: false };
//   try {
//     const count = await prisma.orderItem.count({
//       where: { product: { courses: { some: { courseId } } } },
//     });

//     const countProd = await prisma.product.count({
//       where: { courses: { some: { courseId } } },
//     });
//     // Vi returnerar success: true även om count är 0
//     return { found: true, count, countProd };
//   } catch (e) {
//     console.error(e);
//     return { found: false };
//   }
// }

// export async function getTeacher(userId: string) {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return { found: false };
//   try {
//     const teacher = await prisma.user.findUnique({
//       where: { id: userId },
//     });

//     return { found: true, teacher: teacher };
//   } catch (e) {
//     console.error(e);
//     return { found: false };
//   }
// }

// export type UserPurchasesForCourse = Prisma.UserGetPayload<{
//   select: {
//     id: true;
//     name: true;
//     purchases: {
//       select: {
//         id: true;
//         product: { select: { id: true; name: true } };
//         PurchaseItems: {
//           select: { id: true; remainingCount: true };
//         };
//       };
//     };
//   };
// }>;

// export async function getUsersWithPurchasedProductsWithCourseInIt(
//   courseId: string,
// ): Promise<{
//   success: boolean;
//   msg?: string;
//   users?: UserPurchasesForCourse[];
// }> {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return { success: false, msg: "No permission." };
//   try {
//     const usersWithData = await prisma.user.findMany({
//       where: {
//         purchases: {
//           some: {
//             PurchaseItems: {
//               some: { courseId: courseId, remainingCount: { gt: 0 } },
//             },
//           },
//         },
//       },
//       select: {
//         id: true,
//         name: true,
//         purchases: {
//           where: {
//             PurchaseItems: {
//               some: { courseId, remainingCount: { gt: 0 } },
//             },
//           },
//           select: {
//             id: true,
//             product: {
//               select: { id: true, name: true }, // Vi skippar price här!
//             },
//             PurchaseItems: {
//               where: { courseId, remainingCount: { gt: 0 } },
//               select: {
//                 id: true,
//                 remainingCount: true,
//               },
//             },
//           },
//         },
//       },
//     });

//     if (!usersWithData) {
//       return { success: false, msg: "Användaren hittades inte." };
//     }

//     return {
//       success: true,
//       msg: "Hämtade användare och giltiga köp.",
//       users: usersWithData,
//     };
//   } catch (e) {
//     console.error(e);
//     return { success: false };
//   }
// }

// export type UserPurchaseWithProduct = {
//   purchase: {
//     totalCount: number | null;
//     id: string;
//     remainingCount: number | null;
//     useTotalCount: boolean;
//     product: {
//       totalCount: number | null;
//       id: string;
//       name: string;
//       useTotalCount: boolean;
//     };
//   };
// } & {
//   id: string;
//   createdAt: Date;
//   updatedAt: Date;
//   purchaseId: string;
//   orderItemId: string;
//   courseId: string;
//   lessonsIncluded: number;
//   remainingCount: number;
// };

// export async function getUserPurchases(): Promise<UserPurchaseWithProduct[]> {
//   const session = await getSessionData();

//   if (!session) return [];

//   try {
//     const purchases = await prisma.purchaseItem.findMany({
//       where: {
//         purchase: { userId: session.user.id },
//       },

//       include: {
//         purchase: {
//           select: {
//             id: true,

//             useTotalCount: true,

//             totalCount: true,

//             remainingCount: true,

//             product: {
//               select: {
//                 id: true,

//                 name: true,

//                 useTotalCount: true,

//                 totalCount: true,
//               },
//             },
//           },
//         },
//       },
//     });

//     return purchases;
//   } catch (_e) {
//     return [];
//   }
// }

// export async function addUserInLesson(
//   formData: z.output<typeof AdminAddUserInLessonSchema>,
// ): Promise<{ success: boolean; msg?: string }> {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return { success: false, msg: "No permission." };

//   try {
//     const validated = await AdminAddUserInLessonSchema.parseAsync(formData);

//     // 1. Hämta PurchaseItem och dess tillhörande Purchase (för att se klippkorts-inställningar)
//     const pItem = await prisma.purchaseItem.findUnique({
//       where: { id: validated.purchaseId },
//       include: {
//         purchase: true,
//       },
//     });

//     if (!pItem) return { success: false, msg: "Kunde inte hitta köpet." };

//     const purchase = pItem.purchase;

//     // 2. Kontrollera saldo baserat på produkttyp
//     if (purchase.useTotalCount) {
//       // Klippkort: Kolla saldot på huvudköpet
//       if ((purchase.remainingCount ?? 0) <= 0) {
//         return { success: false, msg: "Inga klipp kvar på klippkortet." };
//       }
//     } else {
//       // Kursbundet: Kolla saldot på det specifika föremålet
//       if (pItem.remainingCount <= 0) {
//         return { success: false, msg: "Inga tillfällen kvar på denna kurs." };
//       }
//     }

//     // 3. Kolla om eleven redan är bokad
//     const existingBooking = await prisma.booking.findFirst({
//       where: {
//         lessonId: validated.lessonId,
//         userId: validated.userId,
//       },
//     });

//     if (existingBooking) {
//       return {
//         success: false,
//         msg: "Användaren är redan registrerad på denna lektion.",
//       };
//     }

//     // 4. Kolla om lektionen är inställd
//     const lesson = await prisma.lesson.findUnique({
//       where: { id: validated.lessonId },
//       select: { cancelled: true },
//     });

//     if (lesson?.cancelled) {
//       return {
//         success: false,
//         msg: "Kan inte lägga till elever i en inställd lektion.",
//       };
//     }

//     // 5. Utför bokning och saldominskning i en transaktion
//     await prisma.$transaction(async (tx) => {
//       // Skapa bokningen
//       await tx.booking.create({
//         data: {
//           lessonId: validated.lessonId,
//           userId: validated.userId,
//           purchaseItemId: pItem.id,
//         },
//       });

//       if (purchase.useTotalCount) {
//         // Minska saldo på huvudköpet (Klippkort)
//         await tx.purchase.update({
//           where: { id: purchase.id },
//           data: { remainingCount: { decrement: 1 } },
//         });
//       } else {
//         // Minska saldo på purchaseItem (Kursbundet)
//         await tx.purchaseItem.update({
//           where: { id: pItem.id },
//           data: { remainingCount: { decrement: 1 } },
//         });
//       }
//     });

//     revalidatePath("/admin/courses");

//     return { success: true, msg: "Användaren blev tillagd i lektionen." };
//   } catch (e) {
//     console.error("Error in addUserInLesson:", e);
//     return { success: false, msg: "Ett tekniskt fel uppstod." };
//   }
// }

// export async function removeUserFromLesson(
//   userId: string,
//   lessonId: string,
// ): Promise<{ success: boolean; msg?: string }> {
//   const isAdmin = await isAdminRole();
//   if (!isAdmin) return { success: false, msg: "No permission." };

//   try {
//     // 1. KOLLA STATUS PÅ LEKTIONEN
//     const lesson = await prisma.lesson.findUnique({
//       where: { id: lessonId },
//       select: { cancelled: true },
//     });

//     if (lesson?.cancelled) {
//       return {
//         success: false,
//         msg: "Kan inte ta bort elev i en inställd lektion. Eleven har redan fått tillbaka sin bokning.",
//       };
//     }

//     await prisma.$transaction(async (tx) => {
//       // 2. Hitta bokningen och inkludera info om köptyp
//       const booking = await tx.booking.findFirst({
//         where: {
//           userId: userId,
//           lessonId: lessonId,
//         },
//         include: {
//           purchaseItem: {
//             include: {
//               purchase: true,
//             },
//           },
//         },
//       });

//       if (!booking) {
//         throw new Error(
//           "Ingen bokning hittades för denna användare på denna lektion.",
//         );
//       }

//       const purchase = booking.purchaseItem.purchase;

//       // 3. Ta bort bokningen
//       await tx.booking.delete({
//         where: { id: booking.id },
//       });

//       // 4. Ge tillbaka klippet på RÄTT ställe
//       if (purchase.useTotalCount) {
//         // Återställ till huvudköpet (Klippkort)
//         await tx.purchase.update({
//           where: { id: purchase.id },
//           data: { remainingCount: { increment: 1 } },
//         });
//       } else {
//         // Återställ till purchaseItem (Kursbundet)
//         await tx.purchaseItem.update({
//           where: { id: booking.purchaseItemId },
//           data: { remainingCount: { increment: 1 } },
//         });
//       }
//     });

//     revalidatePath("/admin/courses");
//     return { success: true, msg: "Närvaro borttagen och klipp återställt." };
//   } catch (e) {
//     console.error("Fel vid borttagning av närvaro:", e);
//     const errorMsg =
//       e instanceof Error ? e.message : "Kunde inte ta bort närvaro.";
//     return { success: false, msg: errorMsg };
//   }
// }
