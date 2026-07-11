"use server";

import { TZDate } from "@date-fns/tz";
import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
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
  Studio,
  Termin,
  User,
} from "@/generated/prisma/client";
import {
  AddStudentToLessonForm,
  AdminProductCourseItemSchema,
  adminAddCourseSchema,
  adminBulkCancelLessonsSchema,
  adminEditEventSchema,
  adminEventSchema,
  adminLessonFormSchema,
  adminProductSchema,
} from "@/validations/adminforms";
import { auth } from "../auth";
import { formatLongFriendlyDate } from "../date-utils";
import { generateBookingCancelledHtml, sendMail } from "../mail";
import { sekToOre } from "../money";
import prisma from "../prisma";
import { dbToFormTime, formToDbDate } from "../time-convert";
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
 * Page-level admin guard. Call from a server component to abort
 * rendering with a 404 if the caller isn't an admin. Use this in
 * addition to the layout-level check for defense-in-depth.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminRole())) notFound();
}

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
 * Needed in admin/termin to list all schemaitems, including course for building coursename (see GetCourseName in app/tools).
 *
 */
export type SchemaItemWithCourseStudioLessons = SchemaItem & {
  course: Course;
  studio: Studio | null;
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
): Promise<SchemaItemWithCourseStudioLessons[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  const schemaItems = await prisma.schemaItem.findMany({
    where: { terminId },
    include: { course: true, Lessons: true, studio: true },
  });

  return schemaItems;
}

/**
 * Listing courses, with filter for course name. (Notice that its not searching for the combined name only the db field name)
 * @param q term for course name.
 * @returns the found courses as Course[]
 * @auth Admin
 */
export async function getAllCourses(
  q: string = "",
  showInactive = false,
): Promise<Course[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  const courses = await prisma.course.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { name_en: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(showInactive ? {} : { active: true }),
    },
    orderBy: { name: "asc" },
  });
  return courses;
}

export async function getAllStudios(): Promise<Studio[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  return await prisma.studio.findMany();
}

export async function addNewEvent(formData: z.infer<typeof adminEventSchema>) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminEventSchema.parseAsync(formData);

    const newEvent = await prisma.event.create({
      data: {
        headline: validated.headline,
        headline_en: validated.headline_en,
        description: validated.description,
        description_en: validated.description_en,
        imageURL: validated.imageURL ?? "",
        link: validated.link ?? "",
        showOnStartpage: validated.showOnStartpage,
        // SÄKRAD: formToDbDate tar emot strängen och låser den till svensk midnatt
        startDate: formToDbDate(validated.startDate),
        endDate:
          validated.endDate && validated.endDate.trim() !== ""
            ? formToDbDate(validated.endDate)
            : null,
      },
    });

    revalidatePath("/admin/events");
    revalidatePath("/");
    return { success: true, msg: `Eventet "${newEvent.headline}" skapades.` };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte skapa eventet." };
  }
}

export async function editNewEvent(
  formData: z.infer<typeof adminEditEventSchema>,
) {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const validated = await adminEditEventSchema.parseAsync(formData);

    const editedEvent = await prisma.event.update({
      where: { id: validated.id },
      data: {
        headline: validated.headline,
        headline_en: validated.headline_en,
        description: validated.description,
        description_en: validated.description_en,
        imageURL: validated.imageURL ?? "",
        link: validated.link ?? "",
        showOnStartpage: validated.showOnStartpage,
        // SÄKRAD: formToDbDate ser till att datumet inte hoppar bakåt till föregående kväll
        startDate: formToDbDate(validated.startDate),
        endDate:
          validated.endDate && validated.endDate.trim() !== ""
            ? formToDbDate(validated.endDate)
            : null,
      },
    });

    revalidatePath("/admin/events");
    revalidatePath("/");
    return {
      success: true,
      msg: `Eventet "${editedEvent.headline}" uppdaterades.`,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte uppdatera eventet." };
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
    const styleId = validated.style?.trim() || undefined;

    const checkTeacherId = await prisma.user.findUnique({
      where: { id: validated.teacherid },
    });

    if (!(checkTeacherId && checkTeacherId.role === "admin"))
      throw new Error(
        `A teacher with id ${validated.teacherid} was not found.`,
      );

    if (styleId) {
      const styleExists = await prisma.style.findUnique({
        where: { id: styleId },
        select: { id: true },
      });
      if (!styleExists)
        throw new Error(`Style with id ${styleId} was not found.`);
    }

    const newCourseItem = await prisma.course.create({
      data: {
        name: validated.name,
        styleId: styleId ?? null,
        name_en: validated.name_en,
        minAge: validated.minAge,
        maxAge: validated.maxAge,
        level: validated.level,
        level_en: validated.level_en,
        adult: validated.adult,
        description: validated.description,
        description_en: validated.description_en,
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
    const styleId = validated.style?.trim() || undefined;

    const checkTeacherId = await prisma.user.findUnique({
      where: { id: validated.teacherid },
    });

    if (!(checkTeacherId && checkTeacherId.role === "admin"))
      throw new Error(
        `A teacher with id ${validated.teacherid} was not found.`,
      );

    if (styleId) {
      const styleExists = await prisma.style.findUnique({
        where: { id: styleId },
        select: { id: true },
      });
      if (!styleExists)
        throw new Error(`Style with id ${styleId} was not found.`);
    }

    const newCourseItem = await prisma.$transaction(async (tx) => {
      const updatedCourse = await tx.course.update({
        data: {
          name: validated.name,
          name_en: validated.name_en,
          styleId: styleId ?? null,
          minAge: validated.minAge,
          maxAge: validated.maxAge,
          level: validated.level,
          level_en: validated.level_en,
          adult: validated.adult,
          description: validated.description,
          description_en: validated.description_en,
          teacherId: validated.teacherid,
        },
        where: { id },
      });

      await tx.lesson.updateMany({
        where: { courseId: id },
        data: { teacherId: validated.teacherid },
      });

      return updatedCourse;
    });

    revalidatePath("/admin");
    revalidatePath("/admin/courses");
    revalidatePath("/admin/lectures");
    return {
      success: true,
      msg: `Kursen ${newCourseItem.name} ändrades.`,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte uppdatera kursen." };
  }
}

export type MailStudentRecipient = {
  name: string;
  email: string;
};
async function sendCancelledMail(
  lesson: Lesson & { course?: { name: string } | null },
  students: MailStudentRecipient[],
): Promise<{
  success: boolean;
  msg: string;
  results: { email: string; name: string; success: boolean }[];
}> {
  const uniqueStudents = Array.from(
    new Map(
      students
        .filter((student) => student.email)
        .map((student) => [student.email.toLowerCase(), student]),
    ).values(),
  );

  const BATCH_SIZE = 10;
  const results: { email: string; name: string; success: boolean }[] = [];

  for (let i = 0; i < uniqueStudents.length; i += BATCH_SIZE) {
    const batch = uniqueStudents.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (student) => {
        const html = await generateBookingCancelledHtml(lesson, student);
        const subject = `Inställd lektion${
          lesson.course?.name ? ` - ${lesson.course.name}` : ""
        }`;

        // Nu använder vi de färdigformaterade, tidszonssäkrade strängarna
        const text = `Hej ${student.name}, din bokade lektion${
          lesson.course?.name ? ` i ${lesson.course.name}` : ""
        } den ${formatLongFriendlyDate(new Date(lesson.startTime))} kl ${dbToFormTime(
          new Date(lesson.startTime),
        )} har blivit inställd. Ditt tillfälle har återställts. `;

        const result = await sendMail(student.email, subject, html, text);

        return {
          email: student.email,
          name: student.name,
          success: result.success,
        };
      }),
    );
    results.push(...batchResults);
  }

  const sentCount = results.filter((result) => result.success).length;
  const failed = results.filter((result) => !result.success);

  return {
    success: failed.length === 0,
    msg:
      results.length === 0
        ? "Inga mottagare att skicka till."
        : failed.length === 0
          ? `Skickade ${sentCount} mail.`
          : `Skickade ${sentCount} mail, men ${failed.length} misslyckades.`,
    results,
  };
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
      include: { bookings: true, course: { select: { name: true } } },
    });

    if (!currentLesson) return { success: false, msg: "Lesson not found." };

    let mailStudents: MailStudentRecipient[] = [];

    await prisma.$transaction(async (tx) => {
      if (!currentLesson.cancelled && validated.cancelled) {
        for (const booking of currentLesson.bookings) {
          const clipResult = await handleClips(tx, booking.purchaseItemId, 1);
          if (!clipResult.success) {
            throw new Error(clipResult.msg || "Clip update failed.");
          }
        }

        // Hämta emails.
        const bookingsToMail = await tx.booking.findMany({
          where: { lessonId: validated.id },
          select: {
            purchaseItem: {
              select: {
                purchase: {
                  select: {
                    participant: { include: { addedBy: true } },
                    user: true,
                  },
                },
              },
            },
          },
        });

        mailStudents = bookingsToMail.map((b) => ({
          name:
            b.purchaseItem.purchase.participant?.name ||
            b.purchaseItem.purchase.user.name,
          email:
            b.purchaseItem.purchase.participant?.email ||
            b.purchaseItem.purchase.participant?.addedBy.email ||
            b.purchaseItem.purchase.user.email,
        }));

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
          message_en: validated.message_en,
          cancelled: validated.cancelled,
        },
      });
    });

    let mailMsg = "Ingen info.";

    if (!currentLesson.cancelled && validated.cancelled) {
      const mailResult = await sendCancelledMail(
        {
          ...currentLesson,
          message: validated.message ?? null,
          message_en: validated.message_en ?? null,
          cancelled: validated.cancelled,
        },
        mailStudents,
      );

      mailMsg = mailResult.msg;

      if (!mailResult.success) {
        mailMsg = ` ${mailResult.msg}`;
      }
    }

    revalidatePath("/admin/lectures");
    revalidatePath("/admin");

    return {
      success: true,
      msg: `Lektionen, bokningar och klipp-saldon har uppdaterats. ${mailMsg}`,
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

    const timeZone = "Europe/Stockholm";
    const from = new Date(
      new TZDate(`${validated.from}T00:00:00`, timeZone).getTime(),
    );
    const to = new Date(
      addDays(new TZDate(`${validated.to}T00:00:00`, timeZone), 1).getTime(),
    );

    const lessons = await prisma.lesson.findMany({
      where: {
        startTime: { gte: from, lt: to },
        courseId: { in: validated.courseIds },
      },
      select: { id: true, cancelled: true },
    });

    if (lessons.length === 0) {
      return { success: false, msg: "Inga lektioner matchade ditt urval." };
    }

    const lessonIds = lessons.map((lesson) => lesson.id);
    const newlyCancelledLessonIds = lessons
      .filter((lesson) => !lesson.cancelled)
      .map((lesson) => lesson.id);

    await prisma.$transaction(async (tx) => {
      if (newlyCancelledLessonIds.length > 0) {
        const bookings = await tx.booking.findMany({
          where: { lessonId: { in: newlyCancelledLessonIds } },
          select: { id: true, purchaseItemId: true },
        });

        for (const booking of bookings) {
          if (!booking.purchaseItemId) continue;

          const clipResult = await handleClips(tx, booking.purchaseItemId, 1);
          if (!clipResult.success) {
            throw new Error(clipResult.msg || "Clip update failed.");
          }
        }

        await tx.booking.deleteMany({
          where: { lessonId: { in: newlyCancelledLessonIds } },
        });
      }

      await tx.lesson.updateMany({
        where: { id: { in: lessonIds } },
        data: {
          cancelled: validated.cancelled,
          message: validated.message,
          message_en: validated.message_en,
        },
      });
    });

    revalidatePath("/admin/lectures");
    revalidatePath("/admin");

    return {
      success: true,
      msg: `${lessonIds.length} lektioner markerades som inställda.`,
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
export async function getAllProducts(showInactive = false): Promise<Product[]> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return [];

  const products = await prisma.product.findMany({
    where: showInactive ? undefined : { active: true },
    orderBy: { name: "asc" },
  });

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
        name_en: validated.name_en,
        description_en: validated.description_en,
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
        name_en: validated.name_en,
        description_en: validated.description_en,
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

    const timeZone = "Europe/Stockholm";
    const now = new TZDate(new Date(), timeZone);

    if (!isAdmin && lesson.startTime.getTime() < now.getTime()) {
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
    revalidatePath("/admin/students");

    return { success: true, msg: "Bokningen har tagits bort." };
  } catch (e) {
    console.error("Fel vid borttagning av bokning:", e);
    return { success: false, msg: "Ett tekniskt fel uppstod." };
  }
}

// ─── Active/inactive toggles ───────────────────────────────────────────────

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

export async function toggleCourseActive(
  id: string,
  active: boolean,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const course = await prisma.course.update({
      where: { id },
      data: { active },
    });
    revalidatePath("/admin/courses");
    return {
      success: true,
      msg: `Kursen "${course.name}" är nu ${active ? "aktiv" : "inaktiv"}.`,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte uppdatera kursen." };
  }
}

export async function toggleProductActive(
  id: string,
  active: boolean,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const product = await prisma.product.update({
      where: { id },
      data: { active },
    });
    revalidatePath("/admin/products");
    revalidatePath("/courses");
    return {
      success: true,
      msg: `Produkten "${product.name}" är nu ${active ? "aktiv" : "inaktiv"}.`,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte uppdatera produkten." };
  }
}

export async function toggleEventStartpageVisibility(
  id: string,
  showOnStartpage: boolean,
): Promise<{ success: boolean; msg: string }> {
  const isAdmin = await isAdminRole();
  if (!isAdmin) return { success: false, msg: "No permission." };

  try {
    const event = await prisma.event.update({
      where: { id },
      data: { showOnStartpage },
    });
    revalidatePath("/admin/events");
    revalidatePath("/");
    return {
      success: true,
      msg: `Eventet "${event.headline}" visas nu ${showOnStartpage ? "" : "inte "}på startsidan.`,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      msg: "Kunde inte uppdatera eventets synlighet på startsidan.",
    };
  }
}
