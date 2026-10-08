"use server";

import { revalidatePath } from "next/cache";
import type { Course, Prisma, Product } from "@/generated/prisma/client";
import { handleClips } from "../clips";
import prisma from "../prisma";
import { getCourseName } from "../tools";
import { getSessionData } from "./sessiondata";

export type BookingWithLesson = Prisma.BookingGetPayload<{
  include: {
    lesson: {
      include: { course: true };
    };
    purchaseItem: {
      include: {
        purchase: {
          include: {
            product: true;
            participant: true;
          };
        };
      };
    };
  };
}>;

export async function getUserBookings(): Promise<{
  success: boolean;
  msg: string;
  bookings?: BookingWithLesson[];
}> {
  const sessionData = await getSessionData();
  const user = sessionData?.user;

  if (!user) return { success: false, msg: "No valid user session" };

  try {
    const lessonsWithBookings = await prisma.booking.findMany({
      where: {
        OR: [
          { userId: user.id },
          { purchaseItem: { purchase: { participant: { userId: user.id } } } },
        ],
      },
      include: {
        lesson: {
          include: { course: true },
        },
        purchaseItem: {
          include: {
            purchase: {
              include: {
                product: true,
                participant: true,
              },
            },
          },
        },
      },
    });

    return {
      success: !!lessonsWithBookings,
      msg: "Hämtade lektioner ",
      bookings: lessonsWithBookings,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte hämta bokningar." };
  }
}

export type LessonWithCourse = Prisma.LessonGetPayload<{
  include: { course: true };
}>;

export async function getUserLessons(): Promise<{
  success: boolean;
  msg: string;
  lessons?: LessonWithCourse[];
}> {
  const sessionData = await getSessionData();
  const user = sessionData?.user;

  if (!user) return { success: false, msg: "No valid user session" };

  try {
    // 1. Find all purchaseItems the user has access to
    const userPurchases = await prisma.purchaseItem.findMany({
      where: {
        OR: [
          { purchase: { userId: user.id } },
          { purchase: { participant: { userId: user.id } } },
        ],
      },
      select: {
        courseId: true,
        orderItemId: true,
        orderItem: {
          select: {
            id: true,
            product: { select: { maxCourses: true } },
            courseSelections: { select: { courseId: true } },
          },
        },
      },
    });

    if (userPurchases.length === 0) {
      return { success: true, msg: "Inga aktiva kurser hittades", lessons: [] };
    }

    // 2. Build the set of courseIds the user can access.
    //    For products with maxCourses set, only include courses from OrderItemCourseSelection.
    //    For all other products, include the purchaseItem's own courseId.
    const courseIdSet = new Set<string>();
    for (const pi of userPurchases) {
      const maxCourses = pi.orderItem?.product?.maxCourses;
      if (maxCourses != null) {
        // Only courses the customer explicitly chose
        for (const sel of pi.orderItem?.courseSelections ?? []) {
          courseIdSet.add(sel.courseId);
        }
      } else {
        courseIdSet.add(pi.courseId);
      }
    }

    const courseIds = Array.from(courseIdSet);
    if (courseIds.length === 0) {
      return { success: true, msg: "Inga aktiva kurser hittades", lessons: [] };
    }

    // 3. Fetch all lessons for these courses
    const lessons = await prisma.lesson.findMany({
      where: {
        courseId: { in: courseIds },
      },
      include: { course: true },
      orderBy: { startTime: "asc" },
    });

    return {
      success: true,
      msg: "Hämtade bokningsbara lektioner",
      lessons: lessons,
    };
  } catch (e) {
    console.error(e);
    return { success: false, msg: "Kunde inte hämta lektioner" };
  }
}

export type UserPurchaseWithProduct = Prisma.PurchaseItemGetPayload<{
  include: {
    orderItem: { include: { courseSelections: true } };
    course: {
      select: {
        name: true;
        name_en: true;
        minAge: true;
        maxAge: true;
        adult: true;
        level: true;
        level_en: true;
      };
    };
    purchase: {
      select: {
        id: true;
        type: true;
        totalCount: true;
        remainingCount: true;
        participantId: true;
        participant: {
          select: {
            id: true;
            name: true;
          };
        };
        product: true;
      };
    };
  };
}>;

export async function getUserPurchases(): Promise<UserPurchaseWithProduct[]> {
  const session = await getSessionData();
  if (!session) return [];

  try {
    const purchases = await prisma.purchaseItem.findMany({
      where: {
        OR: [
          { purchase: { userId: session.user.id } },
          { purchase: { participant: { userId: session.user.id } } },
        ],
      },
      include: {
        orderItem: { include: { courseSelections: true } },
        course: {
          // Allt det fullständiga namnet byggs av. Kursnamnet ensamt skiljer
          // inte på åldrar och nivåer, och på ett terminskort är det i den här
          // listan kunden väljer vilken kurs hen ska boka.
          select: {
            name: true,
            name_en: true,
            minAge: true,
            maxAge: true,
            adult: true,
            level: true,
            level_en: true,
          },
        },
        purchase: {
          select: {
            id: true,
            type: true,
            totalCount: true,
            remainingCount: true,
            participantId: true,
            participant: {
              select: {
                id: true,
                name: true,
              },
            },
            product: true,
          },
        },
      },
    });

    return purchases;
  } catch (_e) {
    return [];
  }
}

export async function getUserPendingRegistrations() {
  const session = await getSessionData();
  if (!session) return [];

  // Find all order items where the user is a participant and the order is still awaiting approval
  return prisma.orderItem.findMany({
    where: {
      order: {
        status: { in: ["AWAITING_APPROVAL"] },
      },
      OR: [
        { order: { userId: session.user.id } },
        { participant: { userId: session.user.id } },
      ],
    },
    include: {
      product: true,
      participant: true,
      order: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function delBooking(
  lessonId: string,
  purchaseItemId: string,
): Promise<{ success: boolean; msg?: string }> {
  const sessionData = await getSessionData();
  const user = sessionData?.user;

  // Säkerställ att användaren bara kan ta bort sina egna bokningar
  if (!user) return { success: false, msg: "Ingen giltig session." };

  try {
    // 1. Hämta lektionsstatus och tid
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, cancelled: true, startTime: true },
    });

    if (!lesson) return { success: false, msg: "Lektionen hittades inte." };

    if (lesson.cancelled) {
      return {
        success: false,
        msg: "Lektionen är redan inställd och klipp bör redan ha återbetalats.",
      };
    }

    // Valfritt: Hindra avbokning om lektionen redan har börjat
    if (new Date() > lesson.startTime) {
      return {
        success: false,
        msg: "Kan inte avboka en lektion som redan har startat.",
      };
    }

    await prisma.$transaction(async (tx) => {
      // 2. Hitta bokningen inkl. köp-info
      const booking = await tx.booking.findFirst({
        where: {
          userId: user.id,
          purchaseItemId: purchaseItemId,
          lessonId: lessonId,
        },
      });

      if (!booking) {
        throw new Error("Ingen bokning hittades.");
      }

      // Behövs inte?:
      // const purchase = booking.purchaseItem.purchase;

      // 3. Ta bort bokningen
      await tx.booking.delete({
        where: { id: booking.id },
      });

      const clipResult = await handleClips(tx, booking.purchaseItemId, 1);
      if (!clipResult.success) {
        throw new Error(clipResult.msg || "Clip update failed.");
      }
    });

    revalidatePath("/user"); // Eller den path där användaren ser sina bokningar
    return {
      success: true,
      msg: "Bokningen är borttagen och ditt saldo har uppdaterats.",
    };
  } catch (e) {
    console.error("Fel vid avbokning:", e);
    return { success: false, msg: "Kunde inte genomföra avbokningen." };
  }
}

export async function getFullCourseNameFromId(
  id: string,
  lang: "sv" | "en" = "sv",
) {
  const course = await prisma.course.findUnique({ where: { id } });

  if (!course) {
    throw new Error(
      "No course was found calling getFullCourseNameFromId with id " +
        id +
        " and lang " +
        lang,
    );
  }

  return getCourseName(course, lang);
}

export async function getAllCoursesInProduct(pid: string): Promise<Course[]> {
  try {
    const courses: Course[] = [];

    const c = await prisma.productOnCourse.findMany({
      where: { productId: pid },
      include: { course: true },
    });

    c.forEach((itm) => {
      courses.push(itm.course);
    });

    return courses;
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function getAllProducts(): Promise<Product[]> {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
    });

    return products;
  } catch (e) {
    console.error(e);
    return [];
  }
}

// Denna används ej:
// export async function getProductTermin(pid: string): Promise<Termin[]> {
//   try {
//     // 1. Hämta produkten och gå djupt ner i relationerna på en gång
//     const product = await prisma.product.findUnique({
//       where: { id: pid },
//       include: {
//         courses: {
//           include: {
//             course: {
//               include: {
//                 schemaItems: {
//                   include: {
//                     termin: true,
//                   },
//                 },
//               },
//             },
//           },
//         },
//       },
//     });

//     if (!product) return [];

//     // 2. Extrahera alla unika terminer med hjälp av en Map (för att undvika dubbletter)
//     const terminMap = new Map<string, Termin>();

//     product.courses.forEach((pc) => {
//       pc.course.schemaItems.forEach((si) => {
//         if (si.termin) {
//           terminMap.set(si.termin.id, si.termin);
//         }
//       });
//     });

//     // Returnera som en array
//     return Array.from(terminMap.values());
//   } catch (e) {
//     console.error("Fel vid hämtning av terminer för produkt:", e);
//     return [];
//   }
// }

// fix: Denna används ej.
// export async function getProductSchema(pid: string) {
//   try {
//     const schemaItems = await prisma.schemaItem.findMany({
//       where: {
//         course: {
//           products: {
//             some: {
//               productId: pid,
//             },
//           },
//         },
//       },
//       orderBy: {
//         weekday: "asc", // Eller vad som passar din sortering
//       },
//     });

//     return schemaItems;
//   } catch (e) {
//     console.error("Fel vid hämtning av schema för produkt:", e);
//     return [];
//   }
// }

// // Denna används ej, kommenterar ut den sålänge får vi se om någon saknar den.
// export async function getCourseCountInProduct(
//   productId: string,
//   courseId: string,
// ): Promise<number> {
//   try {
//     // fix: ej för klippkort än.

//     // Vi letar i kopplingstabellen mellan produkt och kurs
//     const relation = await prisma.productOnCourse.findUnique({
//       where: {
//         courseId_productId: {
//           productId: productId,
//           courseId: courseId,
//         },
//       },
//       select: {
//         lessonsIncluded: true,
//       },
//     });

//     return relation?.lessonsIncluded ?? 0;
//   } catch (e) {
//     console.error("Fel vid hämtning av bokningsgräns:", e);
//     return 0;
//   }
// }

// Counts how many slots are left for a course, so we can show it on the cards on the course page.
// Returns the total number of slots left, or null if there is no limit (unlimitedCustomers = true).
export async function getRemainingSlotsForCourse(
  productId: string,
  maxCustomer: number,
) {
  const totalPurchases = await prisma.purchase.count({
    where: { productId: productId },
  });
  return maxCustomer - totalPurchases;
}
