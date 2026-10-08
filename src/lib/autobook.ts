// Bokar in en kursrad på kursens kommande lektioner.
//
// Ligger medvetet utanför en "use server"-fil, precis som handleClips: varje
// export i en sådan blir en publik endpoint, och den här funktionen har en
// flagga (explicit) som stänger av spärrar. Den ska bara nås inifrån
// serverkod som redan gjort sin egen kontroll — ordergodkännandet,
// schemadialogen, elevlistan och bookMyCourse.

import { revalidatePath } from "next/cache";
import type { Booking, Prisma } from "@/generated/prisma/client";
import {
  calcRemainingCount,
  hasRemainingCount,
} from "./actions/purchase-helpers";
import { getSessionData } from "./actions/sessiondata";
import { handleClips } from "./clips";
import { studentKeyOf } from "./course-roster";
import prisma from "./prisma";

export type AutobookOptions = {
  /**
   * Sant när någon uttryckligen valt just den här kursen, i stället för att
   * bokningen sker automatiskt när en order godkänns. Då gäller inte de
   * spärrar som finns för att skydda mot att systemet gissar åt kunden.
   */
  explicit?: boolean;
};

export async function autobook(
  purchaseItemId: string,
  optTx?: Prisma.TransactionClient,
  opts?: AutobookOptions,
): Promise<Booking[]> {
  const sessionData = await getSessionData();
  const sessionUser = sessionData?.user;
  if (!sessionUser) return [];

  const isAdmin = sessionUser.role === "admin";

  const book = async (tx: Prisma.TransactionClient): Promise<Booking[]> => {
    // Lås kursraden. Två samtidiga anrop — ett dubbelklick, eller
    // ordergodkännandet och schemadialogen — skulle annars båda se samma
    // lediga lektioner och samma saldo, och boka in eleven två gånger.
    await tx.$queryRaw`SELECT id FROM purchase_item WHERE id = ${purchaseItemId} FOR UPDATE`;

    const purchaseItem = await tx.purchaseItem.findUnique({
      where: { id: purchaseItemId },
      include: {
        purchase: {
          include: {
            product: {
              select: {
                autobook: true,
                maxCourses: true,
                type: true,
                courses: { select: { courseId: true } },
              },
            },
          },
        },
        course: true,
      },
    });
    if (!purchaseItem) return [];

    const purchase = purchaseItem.purchase;
    const course = purchaseItem.course;
    const participantId = purchase.participantId;
    const product = purchase.product;

    // Säkerhetscheck: admin får boka för andra, övriga bara för sina egna köp.
    if (!isAdmin && purchase.userId !== sessionUser.id) return [];

    // 1. Produkten måste ha autobokning aktiverad — men bara när bokningen
    // sker automatiskt. Terminskort och program har den avstängd just för att
    // ingen ska bokas in av sig själv, och det är dem schemadialogen finns
    // för: har någon bockat i kursen är det ett uttryckligt val.
    if (!opts?.explicit && !product.autobook) return [];

    // 2. Ett klippkort som gäller flera kurser har en gemensam pott, så en
    // automatisk bokning skulle bränna alla klipp på den kurs som råkar komma
    // först. Har någon pekat ut kursen är valet däremot medvetet.
    if (
      !opts?.explicit &&
      product.type === "CLIP" &&
      product.courses.length > 1
    )
      return [];

    // 3. Om produkten begränsar antal valbara kurser (maxCourses satt),
    // autoboka bara den/de kurser kunden faktiskt valde vid köpet. Bara en
    // admin kan välja bort spärren.
    if (product.maxCourses !== null && !(opts?.explicit && isAdmin)) {
      const selection = await tx.orderItemCourseSelection.findUnique({
        where: {
          orderItemId_courseId: {
            orderItemId: purchaseItem.orderItemId,
            courseId: course.id,
          },
        },
        select: { id: true },
      });
      if (!selection) return [];
    }

    const aClip = calcRemainingCount({ purchase, purchaseItem });
    if (!hasRemainingCount(aClip)) return [];

    const lessonsToBook = await tx.lesson.findMany({
      where: {
        courseId: course.id,
        startTime: { gte: new Date() },
        cancelled: false,
      },
      orderBy: { startTime: "asc" },
      select: { id: true },
    });
    if (lessonsToBook.length === 0) return [];

    const existingBookings = await tx.booking.findMany({
      where: {
        lessonId: { in: lessonsToBook.map((l) => l.id) },
        ...(participantId
          ? { purchaseItem: { purchase: { participantId: participantId } } }
          : {
              userId: purchase.userId,
              purchaseItem: { purchase: { participantId: null } },
            }),
      },
      select: { lessonId: true },
    });

    const existingIds = new Set(existingBookings.map((b) => b.lessonId));
    const lessons = lessonsToBook
      .filter((lesson) => !existingIds.has(lesson.id))
      .slice(0, aClip);
    if (lessons.length === 0) return [];

    const created: Booking[] = [];
    for (const lesson of lessons) {
      created.push(
        await tx.booking.create({
          data: {
            lessonId: lesson.id,
            userId: purchase.userId,
            purchaseItemId: purchaseItem.id,
          },
        }),
      );
    }

    const clipResult = await handleClips(tx, purchaseItem.id, -created.length);
    if (!clipResult.success) {
      throw new Error(clipResult.msg || "Clip update failed.");
    }

    // Den som bokas in går kursen. En tidigare borttagning från kursen
    // skulle annars dölja eleven i elevlistan trots bokningarna — och
    // lektionernas närvarolistor, som följer bokningarna, skulle visa hen.
    // Kunden når aldrig hit på en borttagen kurs: bookMyCourse säger nej
    // innan, och funktionen går inte att anropa direkt.
    await tx.courseRosterEntry.deleteMany({
      where: {
        courseId: course.id,
        studentKey: studentKeyOf(purchase),
        status: "REMOVED",
      },
    });

    return created;
  };

  try {
    // Kör direkt i befintlig transaktion om optTx finns, annars starta en ny.
    const bookings = optTx
      ? await book(optTx)
      : await prisma.$transaction(book);
    if (bookings.length > 0) revalidatePath("/user");
    return bookings;
  } catch (e) {
    console.error("Kunde inte autoboka lektioner", e);
    return [];
  }
}
