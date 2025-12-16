"use server";

import type { User } from "better-auth";
import type z from "zod";
import type {
  Booking,
  Course,
  Lesson,
  Product,
  SchemaItem,
  Termin,
  Weekday,
} from "@/generated/prisma/client";
import {
  adminAddCourseSchema,
  adminAddCourseToSchemaSchema,
  type adminAddProductSchema,
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

  // Behövs mer säkerhet än såhär?

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

export async function editTermin(
  id: string,
  formData: z.infer<typeof adminAddTerminSchema>,
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminAddTerminSchema.parseAsync(formData);

    const newSchemaItem = await prisma.termin.update({
      data: {
        name: validated.name,
        startDate: new Date(validated.startDate), // fix: Validate first as date.
        endDate: new Date(validated.endDate), // fix: Validate first as date.
      },
      where: { id },
    });
    return {
      success: true,
      msg: `Terminen ${newSchemaItem.name} ändrades.`,
    };
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
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

    const edit = await prisma.lesson.update({
      where: { id: validated.id },
      data: { message: validated.message, cancelled: validated.cancelled },
    });

    const editBookings = await prisma.booking.updateMany({
      where: { lessonId: validated.id },
      data: { cancelled: validated.cancelled }, // Så när vi håller koll på prudukter, så räknar vi av de som är inställda, men så ser man ändå bokningarna som gjordes.
    });

    // fix: Maila ut till alla bokade kunder att det är inställt?

    if (edit) {
      return {
        success: true,
        msg: `Tillfället ${edit.id} och ${editBookings.count} bokningar uppdaterades.`,
      };
    } else {
      return { success: false, msg: `${validated.id} not found.` };
    }
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
  }
}

//ev, får se vad som behövs: export type ProductWithCourses = Product & { courses: Course[] };

export type ProductWithNumberPrice = Omit<Product, "price"> & { price: number };

export async function getAllProducts(): Promise<Product[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  const products = await prisma.product.findMany();

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
    // const validated = await adminAddProductSchema.parseAsync(formData);
    console.log(JSON.stringify(formData));
    // fix:
    // const newCourseItem = await prisma.product.create({
    //   data: {
    //     name: validated.name,
    //     maxBookings: validated.maxbookings,
    //     minAge: validated.minAge,
    //     maxAge: validated.maxAge,
    //     level: validated.level,
    //     adult: validated.adult,
    //     description: validated.description,
    //     teacherId: validated.teacherid,
    //   },
    // });
    return {
      success: true,
      msg: `Produkten skapades.`, // fix
    };
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
  }
}
