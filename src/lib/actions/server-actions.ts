/*
Sammanfattning av ändringar:
- Utökade server-actions för användarflöden: bokningar, lektioner, köp och pending-registreringar.
- Bokningslogik säkras med saldo-/typkontroll (klipp vs kurs), kapacitet och dubbletter.
- Autobokning av kurstillfällen med hänsyn till fulla lektioner och kvarvarande saldo.
- Avbokning återställer klipp korrekt och hanterar tids-/statuskontroller.
*/
"use server";

import { revalidatePath } from "next/cache";
import type z from "zod";
import type { Prisma, ProductType } from "@/generated/prisma/client";
import { UserBookLessonSchema } from "@/validations/userforms";
import prisma from "../prisma";
import { handleClips } from "./admin";
import { getSessionData } from "./sessiondata";

export type BookingWithLesson = Prisma.BookingGetPayload<{
  include: {
    lesson: true;
    purchaseItem: { include: { purchase: { include: { participant: true } } } };
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
              include: { participant: true },
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
    return { success: false, msg: JSON.stringify(e) };
  }
}

export type LessonWithCourse = Prisma.LessonGetPayload<{
  include: {
    course: true;
    bookings: { where: { cancelled: false }; select: { id: true } };
  };
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
    // 1. Hitta alla courseId som användaren har köpt (där det finns klipp kvar)
    // Inkludera både där användaren har köpt själv, och där användaren är deltagare på någon annans köp.
    const userPurchases = await prisma.purchaseItem.findMany({
      where: {
        OR: [
          { purchase: { userId: user.id } },
          { purchase: { participant: { userId: user.id } } },
        ],
        // remainingCount: { gt: 0 }, // fixed: Lektionerna skall synas ändå, så detta får kollas i boka-delen istället.
      },
      select: { courseId: true },
    });

    const courseIds = userPurchases.map((p) => p.courseId);

    if (courseIds.length === 0) {
      return { success: true, msg: "Inga aktiva kurser hittades", lessons: [] };
    }

    // 2. Hämta alla lektioner för dessa kurser
    const lessons = await prisma.lesson.findMany({
      where: {
        courseId: { in: courseIds },
        // cancelled: false, // Vi visar nog bara lektioner som inte är inställda. Fel.
        // startTime: { gte: new Date() } // Valfritt: Visa bara framtida lektioner. Nej man kanske vill se sina tidigare boknignar.
      },
      include: {
        course: true,
        bookings: { where: { cancelled: false }, select: { id: true } },
      },
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

export type UserPurchaseWithProduct = {
  purchase: {
    totalCount: number | null;
    id: string;
    product: {
      totalCount: number | null;
      id: string;
      name: string;
      type: ProductType;
    };
    type: ProductType;
    remainingCount: number | null;
    participant?: {
      id: string;
      name: string;
    } | null;
  };
} & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  type: string;
  courseId: string;
  course: { name: string }; // <--- NYTT: Inkludera kursdata här
  unlimited: boolean;
  lessonsIncluded: number;
  remainingCount: number;
  purchaseId: string;
  orderItemId: string;
};

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
        course: {
          // <--- NYTT: Hämtar kursnamnet direkt
          select: { name: true },
        },
        purchase: {
          select: {
            id: true,
            totalCount: true,
            remainingCount: true,
            type: true,
            participantId: true,
            participant: {
              select: {
                id: true,
                name: true,
              },
            },
            product: {
              select: {
                id: true,
                name: true,
                totalCount: true,
                type: true,
              },
            },
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

  // Find all order items where the user is a participant but the order is still pending/created
  return prisma.orderItem.findMany({
    where: {
      order: {
        status: { in: ["PENDING_PAYMENT", "CREATED"] },
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

export async function addBooking(
  formData: z.output<typeof UserBookLessonSchema>,
): Promise<{ success: boolean; msg?: string }> {
  const sessionData = await getSessionData();
  const user = sessionData?.user;

  if (!user) return { success: false, msg: "Ingen giltig session." };

  try {
    const validated = await UserBookLessonSchema.parseAsync(formData);

    // 1. Hämta PurchaseItem inkl. huvud-Purchase för att se saldotyp och ägare
    const pItem = await prisma.purchaseItem.findUnique({
      where: { id: validated.purchaseId },
      include: { purchase: true },
    });

    if (!pItem) return { success: false, msg: "Kunde inte hitta köpet." };

    // Säkerhetscheck: Äger användaren detta köp?
    if (pItem.purchase.userId !== user.id) {
      return { success: false, msg: "Obehörig åtkomst till köpet." };
    }

    const purchase = pItem.purchase;

    // 2. Kontrollera saldo baserat på typ (Klippkort vs Kursbundet)
    if (purchase.type === "CLIP") {
      if ((purchase.remainingCount ?? 0) <= 0) {
        return { success: false, msg: "Inga klipp kvar på klippkortet." };
      }
    } else {
      if (pItem.remainingCount <= 0) {
        return {
          success: false,
          msg: "Inga tillfällen kvar på detta kurskort.",
        };
      }
    }

    // 3. Kontrollera om användaren redan är bokad på lektionen
    const duplicateClauses = purchase.participantId
      ? [
          {
            purchaseItem: {
              purchase: { participantId: purchase.participantId },
            },
          },
        ]
      : [
          {
            userId: user.id,
            purchaseItem: { purchase: { participantId: null } },
          },
        ];
    const existingBooking = await prisma.booking.findFirst({
      where: {
        lessonId: validated.lessonId,
        OR: duplicateClauses,
      },
    });

    if (existingBooking) {
      return { success: false, msg: "Du är redan bokad på denna lektion." };
    }

    // 4. Kolla status och kapacitet på lektionen
    const lesson = await prisma.lesson.findUnique({
      where: { id: validated.lessonId },
      select: { cancelled: true, maxBookings: true },
    });

    if (!lesson || lesson.cancelled) {
      return {
        success: false,
        msg: "Lektionen är inställd eller hittades inte.",
      };
    }

    if (lesson.maxBookings > 0) {
      const currentBookings = await prisma.booking.count({
        where: { lessonId: validated.lessonId, cancelled: false },
      });

      if (currentBookings >= lesson.maxBookings) {
        return { success: false, msg: "Lektionen är fullbokad." };
      }
    }

    // 5. Utför bokning och saldo-dragning i en transaktion
    await prisma.$transaction(async (tx) => {
      const txLesson = await tx.lesson.findUnique({
        where: { id: validated.lessonId },
        select: { cancelled: true, maxBookings: true },
      });

      if (!txLesson || txLesson.cancelled) {
        throw new Error("Lektionen är inställd eller hittades inte.");
      }

      if (txLesson.maxBookings > 0) {
        const currentBookings = await tx.booking.count({
          where: { lessonId: validated.lessonId, cancelled: false },
        });

        if (currentBookings >= txLesson.maxBookings) {
          throw new Error("Lektionen är fullbokad.");
        }
      }

      // Skapa bokningen
      await tx.booking.create({
        data: {
          lessonId: validated.lessonId,
          userId: user.id,
          purchaseItemId: pItem.id,
        },
      });

      const clipResult = await handleClips(tx, pItem.id, -1);
      if (!clipResult.success) {
        throw new Error(clipResult.msg || "Clip update failed.");
      }
    });

    revalidatePath("/user");

    return { success: true, msg: "Du är nu inbokad på lektionen!" };
  } catch (e) {
    console.error("Fel vid bokning:", e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Lektionen är fullbokad.") {
      return { success: false, msg };
    }
    if (msg === "Lektionen är inställd eller hittades inte.") {
      return { success: false, msg };
    }
    return { success: false, msg: "Ett tekniskt fel uppstod vid bokningen." };
  }
}

export async function autoBookCourseLessons(purchaseItemId: string): Promise<{
  success: boolean;
  msg: string;
  bookedCount?: number;
  skippedFull?: number;
  skippedAlreadyBooked?: number;
}> {
  const sessionData = await getSessionData();
  const user = sessionData?.user;

  if (!user) return { success: false, msg: "Ingen giltig session." };

  try {
    const purchaseItem = await prisma.purchaseItem.findUnique({
      where: { id: purchaseItemId },
      select: {
        id: true,
        courseId: true,
        remainingCount: true,
        unlimited: true,
        purchase: {
          select: {
            userId: true,
            type: true,
            remainingCount: true,
            participantId: true,
          },
        },
      },
    });

    if (!purchaseItem) {
      return { success: false, msg: "Kunde inte hitta köpet." };
    }

    if (purchaseItem.purchase.userId !== user.id) {
      return { success: false, msg: "Obehörig åtkomst till köpet." };
    }

    const lessons = await prisma.lesson.findMany({
      where: {
        courseId: purchaseItem.courseId,
        cancelled: false,
        startTime: { gte: new Date() },
      },
      select: { id: true, maxBookings: true, startTime: true },
      orderBy: { startTime: "asc" },
    });

    if (lessons.length === 0) {
      return { success: false, msg: "Inga kommande lektioner att boka." };
    }

    const lessonIds = lessons.map((lesson) => lesson.id);
    const duplicateClauses = purchaseItem.purchase.participantId
      ? [
          {
            purchaseItem: {
              purchase: {
                participantId: purchaseItem.purchase.participantId,
              },
            },
          },
        ]
      : [
          {
            userId: user.id,
            purchaseItem: { purchase: { participantId: null } },
          },
        ];

    const existingBookings = await prisma.booking.findMany({
      where: {
        lessonId: { in: lessonIds },
        OR: duplicateClauses,
      },
      select: { lessonId: true },
    });

    const existingSet = new Set(
      existingBookings.map((booking) => booking.lessonId),
    );

    const lessonsToBook = lessons.filter(
      (lesson) => !existingSet.has(lesson.id),
    );

    if (lessonsToBook.length === 0) {
      return { success: true, msg: "Du är redan bokad på alla tillfällen." };
    }

    const bookingCounts = await prisma.booking.groupBy({
      by: ["lessonId"],
      where: { lessonId: { in: lessonIds }, cancelled: false },
      _count: { _all: true },
    });

    const bookingCountMap = new Map(
      bookingCounts.map((b) => [b.lessonId, b._count._all]),
    );

    let skippedFull = 0;
    const lessonsWithSpace = lessonsToBook.filter((lesson) => {
      if (lesson.maxBookings <= 0) return true;
      const currentCount = bookingCountMap.get(lesson.id) ?? 0;
      if (currentCount >= lesson.maxBookings) {
        skippedFull += 1;
        return false;
      }
      return true;
    });

    if (lessonsWithSpace.length === 0) {
      return { success: false, msg: "Alla kommande lektioner är fullbokade." };
    }

    let skippedNoCredits = 0;
    let lessonsToAutoBook = lessonsWithSpace;
    if (!purchaseItem.unlimited) {
      const remaining =
        purchaseItem.purchase.type === "CLIP"
          ? (purchaseItem.purchase.remainingCount ?? 0)
          : purchaseItem.remainingCount;

      if (remaining <= 0) {
        return { success: false, msg: "Inga bokningar kvar att autoboka." };
      }

      if (remaining < lessonsWithSpace.length) {
        skippedNoCredits = lessonsWithSpace.length - remaining;
        lessonsToAutoBook = lessonsWithSpace.slice(0, remaining);
      }
    }

    let bookedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const lesson of lessonsToAutoBook) {
        if (lesson.maxBookings > 0) {
          const currentCount = await tx.booking.count({
            where: { lessonId: lesson.id, cancelled: false },
          });

          if (currentCount >= lesson.maxBookings) {
            skippedFull += 1;
            continue;
          }
        }

        await tx.booking.create({
          data: {
            lessonId: lesson.id,
            userId: user.id,
            purchaseItemId: purchaseItem.id,
          },
        });

        const clipResult = await handleClips(tx, purchaseItem.id, -1);
        if (!clipResult.success) {
          throw new Error(clipResult.msg || "Clip update failed.");
        }

        bookedCount += 1;
      }
    });

    const skippedAlreadyBooked = existingSet.size;
    const msgParts = [`Bokade ${bookedCount} lektioner.`];
    if (skippedFull > 0) msgParts.push(`${skippedFull} fullbokade.`);
    if (skippedNoCredits > 0)
      msgParts.push(`${skippedNoCredits} saknade saldo.`);
    if (skippedAlreadyBooked > 0)
      msgParts.push(`${skippedAlreadyBooked} redan bokade.`);

    return {
      success: true,
      msg: msgParts.join(" "),
      bookedCount,
      skippedFull,
      skippedAlreadyBooked,
    };
  } catch (e) {
    console.error("Fel vid autobokning:", e);
    return { success: false, msg: "Ett tekniskt fel uppstod vid autobokning." };
  }
}

export async function delBooking(
  bookingId: string,
): Promise<{ success: boolean; msg?: string }> {
  const sessionData = await getSessionData();
  const user = sessionData?.user;

  // Säkerställ att användaren bara kan ta bort sina egna bokningar
  if (!user) return { success: false, msg: "Ingen giltig session." };

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        lesson: { select: { cancelled: true, startTime: true } },
        purchaseItem: { include: { purchase: true } },
      },
    });

    if (!booking) return { success: false, msg: "Bokningen hittades inte." };

    if (booking.userId !== user.id) {
      return { success: false, msg: "Obehörig åtkomst till bokningen." };
    }

    if (booking.lesson.cancelled) {
      return {
        success: false,
        msg: "Lektionen är redan inställd och klipp bör redan ha återbetalats.",
      };
    }

    // Valfritt: Hindra avbokning om lektionen redan har börjat
    if (new Date() > booking.lesson.startTime) {
      return {
        success: false,
        msg: "Kan inte avboka en lektion som redan har startat.",
      };
    }

    await prisma.$transaction(async (tx) => {
      // Ta bort bokningen
      await tx.booking.delete({
        where: { id: bookingId },
      });

      // Ge tillbaka klippet på rätt nivå
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

export async function getFullCourseNameFromId(id: string) {
  const course = await prisma.course.findUnique({ where: { id } });

  if (!course) return null;

  const ageRange =
    course.minAge && course.minAge > 0
      ? `${course.minAge}${
          course.maxAge && course.maxAge > 0
            ? `–${course.maxAge} år` // Använder tankstreck (–) och lägger till " år" här
            : "+ år" // Lägger till "+ år" om maxAge saknas
        }${course.adult ? ` / Vuxen` : ""}`
      : course.adult
        ? "Vuxen" // Om minAge saknas, men adult är true
        : ""; // Om varken minAge eller adult är true
  const levelInfo = course.level && ` - ${course.level}`;

  return `${course.name} ${ageRange} ${levelInfo}`;
}

// Har lagt in filtrring här också.
export async function getAllProductsWithData(filters?: {
  type?: ProductType | "all";
  adult?: "adult" | "child" | "all";
  sort?: "price-asc" | "price-desc" | "name-asc" | "name-desc";
  q?: string;
}) {
  try {
    const andFilters: Prisma.ProductWhereInput[] = [];
    const query = filters?.q?.trim();

    if (filters?.type && filters.type !== "all") {
      andFilters.push({ type: filters.type });
    }

    if (filters?.adult && filters.adult !== "all") {
      const wantsAdult = filters.adult === "adult";
      andFilters.push({
        courses: { some: { course: { adult: wantsAdult } } },
      });
    }

    if (query) {
      andFilters.push({ name: { contains: query, mode: "insensitive" } });
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { name: "asc" };
    switch (filters?.sort) {
      case "price-desc":
        orderBy = { price: "desc" };
        break;
      case "name-asc":
        orderBy = { name: "asc" };
        break;
      case "name-desc":
        orderBy = { name: "desc" };
        break;
      default:
        orderBy = { price: "asc" };
        break;
    }

    const products = await prisma.product.findMany({
      where: andFilters.length > 0 ? { AND: andFilters } : undefined,
      include: {
        courses: {
          include: {
            course: {
              include: {
                // Här hämtar vi schemat direkt via kursen!
                schemaItems: {
                  orderBy: { weekday: "asc" },
                  include: { termin: true, course: true },
                },
              },
            },
          },
        },
        // För att räkna platser kvar
        _count: {
          select: { purchases: true },
        },
      },
      orderBy,
    });

    return products;
  } catch (e) {
    console.error(e);
    return [];
  }
}
