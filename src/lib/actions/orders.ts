"use server";

import prisma from "../prisma";
import { handleClips } from "./admin";
import { getSessionData } from "./sessiondata";

async function requireAdmin() {
  const session = await getSessionData();
  if (!session || session.user.role !== "admin") {
    throw new Error("No permission.");
  }
  return session.user.id;
}

export async function updateOrderStatus(
  orderId: string,
  toStatus:
    | "CREATED"
    | "PENDING_PAYMENT"
    | "AWAITING_APPROVAL"
    | "PAID"
    | "APPROVED",
  note?: string,
) {
  const adminUserId = await requireAdmin();

  return prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id: orderId } });

    if (!current) throw new Error("Order not found");
    if (current.status === toStatus) return { success: true };

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: toStatus },
    });

    await tx.orderStatusEvent.create({
      data: {
        orderId: orderId,
        fromStatus: current.status,
        toStatus: toStatus,
        changedByUserId: adminUserId,
        note,
      },
    });

    return {
      success: true,
      orderId: updated.id,
      status: updated.status,
    };
  });
}

export async function approveOrder(orderId: string, note?: string) {
  return updateOrderStatus(orderId, "APPROVED", note);
}

export async function markOrderPaid(orderId: string, note?: string) {
  return updateOrderStatus(orderId, "PAID", note);
}

export async function adminGetOrder(orderId: string) {
  "use server";
  const adminUserId = await requireAdmin();
  if (!adminUserId) throw new Error("No permission.");
  const id = orderId?.trim();
  if (!id) return null;
  return prisma.order.findUnique({
    where: { id },
    include: {
      user: { include: { details: true } },
      orderItems: { include: { product: true, participant: true } },
      statusEvents: {
        include: { changedBy: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

// fix: klippkort.
// // kör denna när man accepterar ordern.
// fix: Om det bara är 1 kurs, boka alla tillfällen.
export async function createPurchaseFromOrder(orderId: string) {
  await requireAdmin();

  return prisma.$transaction(async (tx) => {
    const now = new Date();

    // 1. SÄKERHETSSPÄRR: Kolla om ordern redan har genererat ett köp
    const existingPurchase = await tx.purchase.findFirst({
      where: { orderId: orderId },
    });

    if (existingPurchase) {
      // Vi returnerar framgång här eftersom målet (att ett köp ska finnas) redan är uppfyllt,
      // men vi skapar inget nytt. Alternativt kasta ett fel om du vill logga det som ett problem.
      return {
        success: true,
        message: "Köp fanns redan för denna order.",
        purchaseId: existingPurchase.id,
      };
    }

    // 2. Hämta ordern (inkludera allt vi behöver för att skapa köpet)
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                courses: true,
              },
            },
          },
        },
      },
    });

    if (!order) throw new Error("Order hittades inte");

    // Kontrollera att ordern är i rätt status för att generera köp
    if (order.status !== "APPROVED" && order.status !== "PAID") {
      throw new Error("Ordern är inte godkänd/betald ännu.");
    }

    // 3. Skapa Purchases för varje OrderItem (en purchase per produkt i ordern)
    const purchaseResults = [];

    for (const orderItem of order.orderItems) {
      // Skapa en purchase för varje enskild enhet i count?
      // För enkelhetens skull skapar vi en purchase per orderItem rad.
      // Om användaren vill ha olika deltagare bör de ha olika rader.
      const purchase = await tx.purchase.create({
        data: {
          userId: order.userId,
          orderId: order.id,
          productId: orderItem.productId,
          participantId: orderItem.participantId,
          // (Fler fält för klippkort kan behövas här om de finns i orderItem)
        },
      });

      // 4. Skapa PurchaseItems för kurserna i denna produkt
      const purchaseItems = await Promise.all(
        orderItem.product.courses.map((pc) =>
          tx.purchaseItem.create({
            data: {
              purchaseId: purchase.id,
              courseId: pc.courseId,
              orderItemId: orderItem.id,
              lessonsIncluded: pc.lessonsIncluded,
              remainingCount: pc.lessonsIncluded,
              unlimited: pc.unlimited ?? false, //okej, så denna är iaf med.
            },
          }),
        ),
      );

      const shouldAutoBook =
        orderItem.product.type === "COURSE" &&
        orderItem.product.courses.length === 1;

      if (shouldAutoBook) {
        const purchaseItem = purchaseItems[0];
        const lessons = await tx.lesson.findMany({
          where: {
            courseId: purchaseItem.courseId,
            cancelled: false,
            startTime: { gte: now },
          },
          select: { id: true, maxBookings: true },
        });

        const lessonIds = lessons.map((lesson) => lesson.id);
        if (lessonIds.length > 0) {
          const existingBookings = await tx.booking.findMany({
            where: {
              userId: purchase.userId,
              lessonId: { in: lessonIds },
            },
            select: { lessonId: true },
          });

          const existingSet = new Set(
            existingBookings.map((booking) => booking.lessonId),
          );

          const lessonsToBook = lessons.filter(
            (lesson) => !existingSet.has(lesson.id),
          );

          if (
            !purchaseItem.unlimited &&
            purchaseItem.remainingCount < lessonsToBook.length
          ) {
            throw new Error(
              "Not enough remaining lessons to auto-book this course.",
            );
          }

          const bookingCounts = await tx.booking.groupBy({
            by: ["lessonId"],
            where: { lessonId: { in: lessonIds }, cancelled: false },
            _count: { _all: true },
          });

          const bookingCountMap = new Map(
            bookingCounts.map((b) => [b.lessonId, b._count._all]),
          );

          for (const lesson of lessonsToBook) {
            const currentCount = bookingCountMap.get(lesson.id) ?? 0;
            if (lesson.maxBookings > 0 && currentCount >= lesson.maxBookings) {
              throw new Error("Lektionen är fullbokad.");
            }

            await tx.booking.create({
              data: {
                lessonId: lesson.id,
                userId: purchase.userId,
                purchaseItemId: purchaseItem.id,
              },
            });

            const clipResult = await handleClips(tx, purchaseItem.id, -1);
            if (!clipResult.success) {
              throw new Error(clipResult.msg || "Clip update failed.");
            }

            bookingCountMap.set(lesson.id, currentCount + 1);
          }
        }
      }

      purchaseResults.push(purchase.id);
    }

    return {
      success: true,
      purchaseIds: purchaseResults,
      message: `${purchaseResults.length} köp skapade.`,
    };
  });
}

export async function getPurchaseFromOrder(id: string) {
  await requireAdmin();
  const p = await prisma.purchase.findMany({ where: { orderId: id } });

  return p;
}

export async function getUserOrders() {
  const session = await getSessionData();
  if (!session) throw new Error("Unauthorized");

  return prisma.order.findMany({
    where: { userId: session.user.id },
    include: {
      orderItems: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserOrder(orderId: string) {
  const session = await getSessionData();
  if (!session) throw new Error("Unauthorized");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      orderItems: {
        include: {
          product: true,
        },
      },
      statusEvents: {
        include: { changedBy: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order || order.userId !== session.user.id) {
    throw new Error("Order not found or access denied");
  }

  return order;
}
