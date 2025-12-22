"use server";

import { revalidatePath } from "next/cache";
import type z from "zod";
import type {
  Prisma,
  Product,
  SchemaItem,
  Termin,
} from "@/generated/prisma/client";
import { UserBookLessonSchema } from "@/validations/userforms";
import prisma from "../prisma";
import { getSessionData } from "./sessiondata";

export type BookingWithLesson = Prisma.BookingGetPayload<{
  include: { lesson: true };
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
      where: { userId: user.id },
      include: { lesson: true },
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
    // 1. Hitta alla courseId som användaren har köpt (där det finns klipp kvar)
    const userPurchases = await prisma.purchaseItem.findMany({
      where: {
        purchase: { userId: user.id },
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

export type UserPurchaseWithProduct = {
  purchase: {
    totalCount: number | null;
    id: string;
    product: {
      totalCount: number | null;
      id: string;
      name: string;
      useTotalCount: boolean;
    };
    useTotalCount: boolean;
    remainingCount: number | null;
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
        purchase: { userId: session.user.id },
      },
      include: {
        course: {
          // <--- NYTT: Hämtar kursnamnet direkt
          select: { name: true },
        },
        purchase: {
          select: {
            id: true,
            useTotalCount: true,
            totalCount: true,
            remainingCount: true,
            product: {
              select: {
                id: true,
                name: true,
                useTotalCount: true,
                totalCount: true,
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
    if (purchase.useTotalCount) {
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
    const existingBooking = await prisma.booking.findFirst({
      where: {
        lessonId: validated.lessonId,
        userId: user.id,
        // Vi kollar på lektionsnivå, användaren ska inte kunna boka samma lektion två gånger
        // oavsett vilket purchaseItem de använder.
      },
    });

    if (existingBooking) {
      return { success: false, msg: "Du är redan bokad på denna lektion." };
    }

    // 4. Kolla status på lektionen
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

    // 5. Utför bokning och saldo-dragning i en transaktion
    await prisma.$transaction(async (tx) => {
      // Skapa bokningen
      await tx.booking.create({
        data: {
          lessonId: validated.lessonId,
          userId: user.id,
          purchaseItemId: pItem.id,
        },
      });

      if (purchase.useTotalCount) {
        // Minska saldo på huvudköpet (Klippkort)
        await tx.purchase.update({
          where: {
            id: purchase.id,
            remainingCount: { gt: 0 },
          },
          data: { remainingCount: { decrement: 1 } },
        });
      } else {
        // Minska saldo på purchaseItem (Kursbundet)
        await tx.purchaseItem.update({
          where: {
            id: pItem.id,
            remainingCount: { gt: 0 },
          },
          data: { remainingCount: { decrement: 1 } },
        });
      }
    });

    revalidatePath("/user");

    return { success: true, msg: "Du är nu inbokad på lektionen!" };
  } catch (e) {
    console.error("Fel vid bokning:", e);
    return { success: false, msg: "Ett tekniskt fel uppstod vid bokningen." };
  }
}

export async function delBooking(
  lessonId: string,
): Promise<{ success: boolean; msg?: string }> {
  const sessionData = await getSessionData();
  const user = sessionData?.user;

  // Säkerställ att användaren bara kan ta bort sina egna bokningar
  if (!user) return { success: false, msg: "Ingen giltig session." };

  try {
    // 1. Hämta lektionsstatus och tid
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { cancelled: true, startTime: true },
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
          lessonId: lessonId,
        },
        include: {
          purchaseItem: {
            include: { purchase: true },
          },
        },
      });

      if (!booking) {
        throw new Error("Ingen bokning hittades.");
      }

      const purchase = booking.purchaseItem.purchase;

      // 3. Ta bort bokningen
      await tx.booking.delete({
        where: { id: booking.id },
      });

      // fix: Här har vi förberett för att hantera klippkort, men använder inte type. Alla kommer vara course så det behövs ej fixas nu innan. Behåller för att påminna mig om logiken. (//tobias)
      // Ge tillbaka klippet på RÄTT nivå
      if (purchase.useTotalCount) {
        // Återställ till Klippkortet (Purchase för klippkort)
        await tx.purchase.update({
          where: { id: purchase.id },
          data: { remainingCount: { increment: 1 } },
        });
      } else {
        // Återställ till den specifika kursen (PurchaseItem)
        await tx.purchaseItem.update({
          where: { id: booking.purchaseItemId },
          data: { remainingCount: { increment: 1 } },
        });
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
  const sessionData = await getSessionData();
  const user = sessionData?.user;

  if (!user) return "";

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

export async function getAllProducts(): Promise<Product[]> {
  const sessionData = await getSessionData();
  const user = sessionData?.user;

  // Säkerställ att användaren bara kan ta bort sina egna bokningar
  if (!user) return [];
  try {
    const products = await prisma.product.findMany();

    return products;
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function getProductTermin(pid: string): Promise<Termin[]> {
  const sessionData = await getSessionData();
  const user = sessionData?.user;

  // Säkerställ att användaren bara kan ta bort sina egna bokningar
  if (!user) return [];
  try {
    // 1. Hämta produkten och gå djupt ner i relationerna på en gång
    const product = await prisma.product.findUnique({
      where: { id: pid },
      include: {
        courses: {
          include: {
            course: {
              include: {
                schemaItems: {
                  include: {
                    termin: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!product) return [];

    // 2. Extrahera alla unika terminer med hjälp av en Map (för att undvika dubbletter)
    const terminMap = new Map<string, Termin>();

    product.courses.forEach((pc) => {
      pc.course.schemaItems.forEach((si) => {
        if (si.termin) {
          terminMap.set(si.termin.id, si.termin);
        }
      });
    });

    // Returnera som en array
    return Array.from(terminMap.values());
  } catch (e) {
    console.error("Fel vid hämtning av terminer för produkt:", e);
    return [];
  }
}

export async function getProductSchema(pid: string): Promise<SchemaItem[]> {
  const sessionData = await getSessionData();
  if (!sessionData?.user) return [];

  try {
    const schemaItems = await prisma.schemaItem.findMany({
      where: {
        course: {
          products: {
            some: {
              productId: pid,
            },
          },
        },
      },
      // include: { // eventuellt.
      //   termin: true,
      //   course: true,
      // },
      orderBy: {
        weekday: "asc", // Eller vad som passar din sortering
      },
    });

    return schemaItems;
  } catch (e) {
    console.error("Fel vid hämtning av schema för produkt:", e);
    return [];
  }
}

export async function getCourseCountInProduct(
  productId: string,
  courseId: string,
): Promise<number> {
  const sessionData = await getSessionData();
  if (!sessionData?.user) return 0;

  try {
    // fix: ej för klippkort än.

    // Vi letar i kopplingstabellen mellan produkt och kurs
    const relation = await prisma.productOnCourse.findUnique({
      where: {
        courseId_productId: {
          productId: productId,
          courseId: courseId,
        },
      },
      select: {
        lessonsIncluded: true,
      },
    });

    return relation?.lessonsIncluded ?? 0;
  } catch (e) {
    console.error("Fel vid hämtning av bokningsgräns:", e);
    return 0;
  }
}
