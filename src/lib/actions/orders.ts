"use server";

import prisma from "../prisma";
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
      user: true,
      orderItems: { include: { product: true } },
      statusEvents: {
        include: { changedBy: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

// fix: klippkort.
// kör denna när man accepterar ordern.
export async function createPurchaseFromOrder(orderId: string) {
  await requireAdmin();

  return prisma.$transaction(async (tx) => {
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

    // 3. Skapa huvudpurchasen
    const purchase = await tx.purchase.create({
      data: {
        userId: order.userId,
        orderId: order.id,
        productId: order.orderItems[0]?.productId,
      },
    });

    // 4. Skapa PurchaseItems
    const purchaseItemPromises = order.orderItems.flatMap((orderItem) =>
      orderItem.product.courses.map((pc) =>
        tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            courseId: pc.courseId,
            orderItemId: orderItem.id,
            lessonsIncluded: pc.lessonsIncluded,
            remainingCount: pc.lessonsIncluded,
            unlimited: pc.unlimited ?? false,
          },
        }),
      ),
    );

    await Promise.all(purchaseItemPromises);

    return {
      success: true,
      purchaseId: purchase.id,
      itemCount: purchaseItemPromises.length,
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
