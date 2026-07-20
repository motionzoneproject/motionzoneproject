"use server";

import { generateOrderApprovedHtml, sendMail } from "../mail";
import prisma from "../prisma";
import { autobook } from "./server-actions";
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
  toStatus: "PENDING_PAYMENT" | "PAID" | "APPROVED" | "CANCELLED",
  note?: string,
) {
  const adminUserId = await requireAdmin();

  return prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id: orderId } });

    if (!current) throw new Error("Order not found");
    if (current.status === toStatus) return { success: true };
    if (
      toStatus === "CANCELLED" &&
      ["APPROVED", "PAID"].includes(current.status)
    ) {
      throw new Error("Kan inte avbryta en redan godkänd eller betald order.");
    }

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

export async function cancelOrder(orderId: string, note?: string) {
  return updateOrderStatus(orderId, "CANCELLED", note);
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

// kör denna när man accepterar ordern.
export async function createPurchaseFromOrder(orderId: string) {
  await requireAdmin();

  const result = await prisma.$transaction(async (tx) => {
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
            participant: true,
            product: {
              include: {
                courses: true,
              },
            },
          },
        },
        user: true,
      },
    });

    if (!order) throw new Error("Order hittades inte");

    // Kontrollera att ordern är i rätt status för att generera köp
    if (!["APPROVED", "PAID"].includes(order.status)) {
      throw new Error("Ordern är inte godkänd/betald ännu.");
    }

    // 3. Skapa Purchases för varje OrderItem (en purchase per produkt i ordern)
    const purchaseResults = [];
    const purchaseItemIdsToAutobook: string[] = [];

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
          type: orderItem.product.type,
          totalCount: orderItem.product.totalCount ?? null,
          remainingCount:
            orderItem.product.type === "CLIP"
              ? (orderItem.product.totalCount ?? 0)
              : null,
        },
      });

      // 4. Skapa PurchaseItems för kurserna i denna produkt
      const itemPromises = orderItem.product.courses.map((pc) =>
        tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            courseId: pc.courseId,
            orderItemId: orderItem.id,
            type: orderItem.product.type,
            lessonsIncluded:
              orderItem.product.type === "CLIP" ? 0 : pc.lessonsIncluded,
            remainingCount:
              orderItem.product.type === "CLIP" ? 0 : pc.lessonsIncluded,
            unlimited: pc.unlimited ?? false,
          },
        }),
      );

      const createdItems = await Promise.all(itemPromises);

      if (orderItem.product.type !== "CLIP") {
        purchaseItemIdsToAutobook.push(...createdItems.map((item) => item.id));
      }

      purchaseResults.push(purchase.id);
    }

    // Skicka ett "Godkänd order"-mail
    try {
      const emails = new Set<string>();
      if (order.user.email) {
        emails.add(order.user.email);
      }
      for (const item of order.orderItems) {
        if (item.participant?.email) {
          emails.add(item.participant.email);
        }
      }

      for (const email of emails) {
        const mailHTML = await generateOrderApprovedHtml(order);
        await sendMail(
          email,
          `Din order är godkänd - Order #${order.id}`,
          mailHTML,
        );
      }
    } catch (emailError) {
      // Logga felet men låt inte transaktionen misslyckas p.g.a. mailproblem
      console.error("Kunde inte skicka godkännandemail för order:", emailError);
    }

    return {
      success: true,
      purchaseIds: purchaseResults,
      purchaseItemIdsToAutobook,
      message: `${purchaseResults.length} köp skapade.`,
    };
  });

  // Autoboka :)
  if (result.success && Array.isArray(result.purchaseItemIdsToAutobook)) {
    await Promise.all(
      result.purchaseItemIdsToAutobook.map((id) => autobook(id)),
    );
  }

  return result;
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
          participant: true,
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
          participant: true,
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
