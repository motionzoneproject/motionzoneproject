"use server";

import { revalidatePath } from "next/cache";
import type { OrderDetail } from "@/app/(admin)/admin/orders/view/view-client";
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
    const current = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                courses: {
                  select: { courseId: true },
                },
              },
            },
            courseSelections: {
              select: { courseId: true },
            },
          },
        },
      },
    });

    if (!current) throw new Error("Order not found");
    if (current.status === toStatus) return { success: true };
    if (
      toStatus === "CANCELLED" &&
      ["APPROVED", "PAID"].includes(current.status)
    ) {
      throw new Error("Kan inte avbryta en redan godkänd eller betald order.");
    }

    if (toStatus === "APPROVED") {
      for (const item of current.orderItems) {
        const maxCourses = item.product.maxCourses;
        if (maxCourses == null) continue;

        const selectedCourseIds = item.courseSelections.map(
          (sel) => sel.courseId,
        );
        const uniqueSelectedIds = new Set(selectedCourseIds);

        if (
          selectedCourseIds.length > maxCourses ||
          selectedCourseIds.length === 0
        ) {
          throw new Error(
            `Du måste välja max ${maxCourses} olika kurser för "${item.product.name}" eeller minst 1st, innan ordern kan godkännas.`,
          );
        }

        if (uniqueSelectedIds.size !== selectedCourseIds.length) {
          throw new Error(
            `Du måste välja olika kurser för "${item.product.name}" innan ordern kan godkännas.`,
          );
        }

        const validCourseIds = new Set(
          item.product.courses.map((link) => link.courseId),
        );
        const invalidCourseId = selectedCourseIds.find(
          (courseId) => !validCourseIds.has(courseId),
        );

        if (invalidCourseId) {
          throw new Error(
            `En vald kurs i "${item.product.name}" finns inte kopplad till produkten och kan därför inte godkännas.`,
          );
        }
      }
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

export async function adminGetOrder(orderId: string): Promise<OrderDetail> {
  "use server";
  const adminUserId = await requireAdmin();
  if (!adminUserId) throw new Error("No permission.");
  const id = orderId?.trim();
  if (!id) return null;
  return prisma.order.findUnique({
    where: { id },
    include: {
      user: { include: { details: true } },
      orderItems: {
        include: {
          product: {
            include: {
              courses: {
                include: { course: true },
              },
            },
          },
          participant: true,
          courseSelections: {
            include: { course: true },
          },
        },
      },
      statusEvents: {
        include: { changedBy: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function updateOrderItemCourseSelections(
  orderItemId: string,
  selectedCourseIds: string[],
): Promise<{ success: boolean; msg?: string; selectedCourseIds?: string[] }> {
  await requireAdmin();

  const id = orderItemId?.trim();
  if (!id) throw new Error("Giltigt orderItemId saknas.");

  const normalized = Array.from(
    new Set((selectedCourseIds ?? []).filter(Boolean).map((x) => x.trim())),
  );

  try {
    return prisma.$transaction(async (tx) => {
      const orderItem = await tx.orderItem.findUnique({
        where: { id },
        include: {
          product: {
            include: {
              courses: { select: { courseId: true } },
            },
          },
        },
      });

      if (!orderItem) throw new Error("Orderitem hittades inte.");
      if (orderItem.product.maxCourses == null) {
        throw new Error("Den här produkten är inte ett paket med kursval.");
      }

      const maxCourses = orderItem.product.maxCourses;

      if (normalized.length === 0 || normalized.length > maxCourses) {
        throw new Error(
          `Du måste välja max ${maxCourses} ${maxCourses === 1 ? "kurs" : "kurser"}, eller minst 1`,
        );
      }

      const validCourseIds = new Set(
        orderItem.product.courses.map((link) => link.courseId),
      );

      for (const courseId of normalized) {
        if (!validCourseIds.has(courseId)) {
          throw new Error(
            "En vald kurs finns inte kopplad till produkten och kan därför inte sparas.",
          );
        }
      }

      await tx.orderItemCourseSelection.deleteMany({
        where: { orderItemId: id },
      });

      if (normalized.length > 0) {
        await tx.orderItemCourseSelection.createMany({
          data: normalized.map((courseId) => ({
            orderItemId: id,
            courseId,
          })),
          skipDuplicates: true,
        });
      }

      revalidatePath("/admin/orders");
      revalidatePath("/admin/orders/view");

      return {
        success: true,
        selectedCourseIds: normalized,
      };
    });
  } catch (e) {
    return { success: false, msg: JSON.stringify(e) };
  }
}

// kör denna när man accepterar ordern.
export async function createPurchaseFromOrder(orderId: string) {
  await requireAdmin();

  // 2. Hämta ordern (inkludera allt vi behöver för att skapa köpet)
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: {
        include: {
          participant: true,
          courseSelections: {
            include: {
              course: {
                select: { name: true },
              },
            },
          },
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

      const selectedCourseIds = new Set(
        (orderItem.courseSelections ?? []).map((sel) => sel.courseId),
      );

      if (orderItem.product.maxCourses != null) {
        if (selectedCourseIds.size === 0) {
          throw new Error(
            `Du måste välja minst en kurs för "${orderItem.product.name}".`,
          );
        }

        if (selectedCourseIds.size > orderItem.product.maxCourses) {
          throw new Error(
            `Du måste välja max ${orderItem.product.maxCourses} kurser för "${orderItem.product.name}`,
          );
        }
      }

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

      const coursesToCreate =
        orderItem.product.maxCourses != null && selectedCourseIds.size > 0
          ? orderItem.product.courses.filter((pc) =>
              selectedCourseIds.has(pc.courseId),
            )
          : orderItem.product.courses;

      // 4. Skapa PurchaseItems för kurserna i denna produkt
      const itemPromises = coursesToCreate.map((pc) =>
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

export async function deleteOrder(orderId: string) {
  await requireAdmin();

  if (!orderId?.trim()) {
    throw new Error("Giltigt orderId saknas");
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error("Ordern hittades inte");
    }

    // 1. Hämta alla purchases kopplade till ordern
    const purchases = await tx.purchase.findMany({
      where: { orderId: order.id },
      select: { id: true },
    });
    const purchaseIds = purchases.map((p) => p.id);

    if (purchaseIds.length > 0) {
      // 2. Hämta alla purchaseItems kopplade till dessa purchases
      const purchaseItems = await tx.purchaseItem.findMany({
        where: { purchaseId: { in: purchaseIds } },
        select: { id: true },
      });
      const purchaseItemIds = purchaseItems.map((pi) => pi.id);

      // 3. Ta bort alla bokningar kopplade till dessa purchaseItems
      if (purchaseItemIds.length > 0) {
        await tx.booking.deleteMany({
          where: { purchaseItemId: { in: purchaseItemIds } },
        });
      }

      // 4. Ta bort alla purchaseItems för dessa purchases
      await tx.purchaseItem.deleteMany({
        where: { purchaseId: { in: purchaseIds } },
      });

      // 5. Ta bort alla purchases för denna order
      await tx.purchase.deleteMany({
        where: { id: { in: purchaseIds } },
      });
    }

    // 6. Ta bort själva ordern (kaskaderar OrderItem och OrderStatusEvent)
    await tx.order.delete({
      where: { id: order.id },
    });

    revalidatePath("/admin/orders");

    return { success: true };
  });
}
