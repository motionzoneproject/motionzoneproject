"use server";

import { TZDate } from "@date-fns/tz";
import { revalidatePath } from "next/cache";
import type { OrderDetail } from "@/app/(admin)/admin/orders/view/view-client";
import type { Prisma, PurchaseItem } from "@/generated/prisma/client";
import { handleClips } from "../clips";
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
  toStatus: "AWAITING_APPROVAL" | "APPROVED" | "CANCELLED",
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
    if (toStatus === "CANCELLED" && current.status === "APPROVED") {
      throw new Error("Kan inte avbryta en redan beviljad order.");
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
            `Du måste välja max ${maxCourses} olika kurser för "${item.product.name}" eller minst 1st, innan ordern kan beviljas.`,
          );
        }

        if (uniqueSelectedIds.size !== selectedCourseIds.length) {
          throw new Error(
            `Du måste välja olika kurser för "${item.product.name}" innan ordern kan beviljas.`,
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
            `En vald kurs i "${item.product.name}" finns inte kopplad till produkten och kan därför inte beviljas.`,
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

/** Sätter betalningsstatus (isPaid) som ett separat fält, oberoende av orderns godkännandestatus. */
export async function setOrderPaid(orderId: string, paid: boolean) {
  await requireAdmin();
  const now = new Date();
  await prisma.order.update({
    where: { id: orderId },
    data: {
      isPaid: paid,
      paidAt: paid ? now : null,
    },
  });
  revalidatePath("/admin/orders");
  return { success: true };
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
                include: {
                  course: {
                    include: {
                      schemaItems: { select: { weekday: true } },
                    },
                  },
                },
              },
            },
          },
          order: { select: { id: true } },
          participant: true,
          courseSelections: {
            include: {
              course: {
                include: {
                  schemaItems: { select: { weekday: true } },
                },
              },
            },
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

export type OrderEditPayload = {
  creates: { productId: string; participantId: string | null }[];
  updates: {
    orderItemId: string;
    productId: string;
    participantId: string | null;
  }[];
  deletes: string[];
};

// Endast ordrar som väntar på godkännande kan redigeras. APPROVED och CANCELLED är låsta.
const EDITABLE_STATUSES = ["AWAITING_APPROVAL"];

export async function updateOrder(
  orderId: string,
  payload: OrderEditPayload,
): Promise<{ success: boolean; msg?: string }> {
  await requireAdmin();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { orderItems: true },
  });

  if (!order) {
    return { success: false, msg: "Ordern hittades inte." };
  }

  if (!EDITABLE_STATUSES.includes(order.status)) {
    return {
      success: false,
      msg: "Ordern kan inte ändras i sitt nuvarande status.",
    };
  }

  // Säkerställ att raderna som ska uppdateras/tas bort faktiskt tillhör ordern
  // (annars kan en admin råka peta i en annan orders rader).
  const orderItemIds = new Set(order.orderItems.map((oi) => oi.id));
  const touchedIds = [
    ...payload.updates.map((u) => u.orderItemId),
    ...payload.deletes,
  ];
  if (touchedIds.some((id) => !orderItemIds.has(id))) {
    return {
      success: false,
      msg: "En eller flera rader hör inte till ordern.",
    };
  }

  const remainingCount =
    order.orderItems.length - payload.deletes.length + payload.creates.length;
  if (remainingCount <= 0) {
    return { success: false, msg: "Ordern måste ha minst en produkt kvar." };
  }

  const productIds = [
    ...new Set([
      ...payload.updates.map((u) => u.productId),
      ...payload.creates.map((c) => c.productId),
    ]),
  ];

  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } } })
    : [];
  const productMap = new Map(products.map((p) => [p.id, p]));

  try {
    await prisma.$transaction(async (tx) => {
      for (const del of payload.deletes) {
        await tx.orderItemCourseSelection.deleteMany({
          where: { orderItemId: del },
        });
        await tx.orderItem.delete({ where: { id: del } });
      }

      for (const upd of payload.updates) {
        const product = productMap.get(upd.productId);
        if (!product) {
          throw new Error(`Produkten hittades inte (${upd.productId}).`);
        }

        const existing = order.orderItems.find(
          (oi) => oi.id === upd.orderItemId,
        );
        const productChanged = existing && existing.productId !== upd.productId;

        await tx.orderItem.update({
          where: { id: upd.orderItemId },
          data: {
            productId: upd.productId,
            participantId: upd.participantId,
            price: product.price,
          },
        });

        if (productChanged) {
          await tx.orderItemCourseSelection.deleteMany({
            where: { orderItemId: upd.orderItemId },
          });
        }
      }

      for (const create of payload.creates) {
        const product = productMap.get(create.productId);
        if (!product) {
          throw new Error(`Produkten hittades inte (${create.productId}).`);
        }

        await tx.orderItem.create({
          data: {
            orderId,
            productId: create.productId,
            participantId: create.participantId,
            count: 1,
            price: product.price,
          },
        });
      }

      const remaining = await tx.orderItem.findMany({ where: { orderId } });
      const totalPrice = remaining.reduce(
        (sum, oi) => sum + oi.price * oi.count,
        0,
      );

      await tx.order.update({ where: { id: orderId }, data: { totalPrice } });
    });

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Ett fel uppstod.";
    return { success: false, msg };
  }
}
export async function updateOrderItemCourseSelections(
  orderId: string,
  orderItemId: string,
  selectedCourseIds: string[],
): Promise<{
  success: boolean;
  msg?: string;
  selectedCourseIds?: string[];
}> {
  await requireAdmin();

  const normalizedOrderId = orderId.trim();
  const normalizedOrderItemId = orderItemId.trim();

  const timeZone = "Europe/Stockholm";
  const now = new TZDate(new Date(), timeZone);

  if (!normalizedOrderId) {
    return {
      success: false,
      msg: "Giltigt orderId saknas.",
    };
  }

  if (!normalizedOrderItemId) {
    return {
      success: false,
      msg: "Giltigt orderItemId saknas.",
    };
  }

  const normalized = Array.from(
    new Set(
      (selectedCourseIds ?? [])
        .filter((courseId): courseId is string => typeof courseId === "string")
        .map((courseId) => courseId.trim())
        .filter(Boolean),
    ),
  );

  try {
    return await prisma.$transaction(async (tx) => {
      const orderItem = await tx.orderItem.findFirst({
        where: {
          id: normalizedOrderItemId,
          orderId: normalizedOrderId,
        },
        include: {
          order: {
            select: {
              id: true,
              status: true,
            },
          },
          product: {
            include: {
              courses: {
                select: {
                  courseId: true,
                  lessonsIncluded: true,
                  unlimited: true,
                },
              },
            },
          },
          courseSelections: {
            select: {
              courseId: true,
            },
          },
        },
      });

      if (!orderItem) {
        throw new Error("Orderraden hittades inte i den angivna ordern.");
      }

      if (orderItem.order.status === "CANCELLED") {
        throw new Error("Paketvalet kan inte ändras på en avbruten order.");
      }

      if (orderItem.product.maxCourses == null) {
        throw new Error("Den här produkten är inte ett paket med kursval.");
      }

      const maxCourses = orderItem.product.maxCourses;

      if (normalized.length === 0) {
        throw new Error("Du måste välja minst en kurs.");
      }

      if (normalized.length > maxCourses) {
        throw new Error(
          `Du får välja högst ${maxCourses} ${
            maxCourses === 1 ? "kurs" : "kurser"
          }.`,
        );
      }

      const productCourses = new Map(
        orderItem.product.courses.map((productCourse) => [
          productCourse.courseId,
          productCourse,
        ]),
      );

      const invalidCourseId = normalized.find(
        (courseId) => !productCourses.has(courseId),
      );

      if (invalidCourseId) {
        throw new Error("En vald kurs finns inte kopplad till produkten.");
      }

      const oldCourseIds = new Set(
        orderItem.courseSelections.map((selection) => selection.courseId),
      );

      const newCourseIds = new Set(normalized);

      const removedCourseIds = [...oldCourseIds].filter(
        (courseId) => !newCourseIds.has(courseId),
      );

      const addedCourseIds = [...newCourseIds].filter(
        (courseId) => !oldCourseIds.has(courseId),
      );

      const purchaseItems = await tx.purchaseItem.findMany({
        where: {
          orderItemId: normalizedOrderItemId,
        },
        select: {
          id: true,
          purchaseId: true,
          courseId: true,
          type: true,
          lessonsIncluded: true,
          remainingCount: true,
          unlimited: true,
          purchase: {
            select: {
              id: true,
              orderId: true,
              type: true,
              remainingCount: true,
            },
          },
        },
      });

      if (purchaseItems.length === 0) {
        await tx.orderItemCourseSelection.deleteMany({
          where: {
            orderItemId: normalizedOrderItemId,
          },
        });

        await tx.orderItemCourseSelection.createMany({
          data: normalized.map((courseId) => ({
            orderItemId: normalizedOrderItemId,
            courseId,
          })),
          skipDuplicates: true,
        });

        revalidatePath("/admin/orders");
        revalidatePath("/admin/orders/view");

        return {
          success: true,
          selectedCourseIds: normalized,
        };
      }

      const purchaseId = purchaseItems[0].purchaseId;

      const purchaseItemsByCourse = new Map(
        purchaseItems.map((purchaseItem) => [
          purchaseItem.courseId,
          purchaseItem,
        ]),
      );

      /*
       * Ta bort gamla kurser som inte längre är valda.
       * Endast framtida bokningar tas bort.
       */
      for (const removedCourseId of removedCourseIds) {
        const oldPurchaseItem = purchaseItemsByCourse.get(removedCourseId);

        if (!oldPurchaseItem) {
          continue;
        }

        const futureBookings = await tx.booking.findMany({
          where: {
            purchaseItemId: oldPurchaseItem.id,
            lesson: {
              startTime: {
                gte: now,
              },
            },
          },
          select: {
            id: true,
          },
        });

        if (futureBookings.length > 0) {
          await tx.booking.deleteMany({
            where: {
              id: {
                in: futureBookings.map((booking) => booking.id),
              },
            },
          });

          const restored = await handleClips(
            tx,
            oldPurchaseItem.id,
            futureBookings.length,
          );

          if (!restored.success) {
            throw new Error(
              restored.msg ??
                "Kunde inte återställa saldo efter borttagna bokningar.",
            );
          }
        }

        const remainingBookings = await tx.booking.count({
          where: {
            purchaseItemId: oldPurchaseItem.id,
          },
        });

        if (remainingBookings === 0) {
          // Om inga bokningar finns kvar alls kan vi radera raden helt
          await tx.purchaseItem.delete({
            where: {
              id: oldPurchaseItem.id,
            },
          });
        } else {
          // Om det finns historiska bokningar kvar: nollställ alla kvarvarande klipp
          await tx.purchaseItem.update({
            where: {
              id: oldPurchaseItem.id,
            },
            data: {
              remainingCount: 0, // nollställ här också så vi slipper se det i närvarohantering i admin.
            },
          });
        }
      }

      const newPI = <PurchaseItem[]>[];

      /*
       * Skapa PurchaseItem för nya kurser med deras fulla pott.
       */
      for (const addedCourseId of addedCourseIds) {
        const productCourse = productCourses.get(addedCourseId);

        if (!productCourse) {
          throw new Error("Den nya kursen saknas i produktens kurskoppling.");
        }

        const alreadyExists = await tx.purchaseItem.findFirst({
          where: {
            purchaseId,
            orderItemId: normalizedOrderItemId,
            courseId: addedCourseId,
          },
        });

        if (alreadyExists) {
          continue;
        }

        const lessonsIncluded = productCourse.lessonsIncluded;

        const createPI = await tx.purchaseItem.create({
          data: {
            purchaseId,
            orderItemId: normalizedOrderItemId,
            courseId: addedCourseId,
            type: orderItem.product.type,
            lessonsIncluded:
              orderItem.product.type === "CLIP" ? 0 : lessonsIncluded,
            remainingCount:
              orderItem.product.type === "CLIP" ? 0 : lessonsIncluded,
            unlimited: productCourse.unlimited ?? false,
          },
        });

        newPI.push(createPI);
      }

      /*
       * Uppdatera orderns kursval.
       */
      await tx.orderItemCourseSelection.deleteMany({
        where: {
          orderItemId: normalizedOrderItemId,
        },
      });

      await tx.orderItemCourseSelection.createMany({
        data: normalized.map((courseId) => ({
          orderItemId: normalizedOrderItemId,
          courseId,
        })),
        skipDuplicates: true,
      });

      // Autoboka nya rader :)
      for (const pi of newPI) {
        const _ab = await autobook(pi.id, tx);
      }

      revalidatePath("/admin/orders");
      revalidatePath("/admin/orders/view");
      revalidatePath("/user");

      return {
        success: true,
        selectedCourseIds: normalized,
      };
    });
  } catch (error) {
    console.error("Kunde inte uppdatera orderradens kursval:", error);

    return {
      success: false,
      msg:
        error instanceof Error
          ? error.message
          : "Kunde inte uppdatera paketvalet.",
    };
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
              course: true,
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
    if (order.status !== "APPROVED") {
      throw new Error("Ordern är inte beviljad ännu.");
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
        `Din plats är beviljad - Order #${order.id}`,
        mailHTML,
      );
    }
  } catch (emailError) {
    // Logga felet men låt inte transaktionen misslyckas p.g.a. mailproblem
    console.error("Kunde inte skicka godkännandemail för order:", emailError);
  }

  return result;
}

const orderPurchaseSelect = {
  id: true,
  type: true,
  remainingCount: true,
  product: {
    select: {
      id: true,
      name: true,
      maxCourses: true,
      courses: {
        select: { courseId: true },
      },
    },
  },
  PurchaseItems: {
    select: {
      id: true,
      orderItemId: true,
      courseId: true,
      remainingCount: true,
      unlimited: true,
      course: true,
      bookings: {
        where: { cancelled: false },
        select: { id: true },
      },
    },
  },
} satisfies Prisma.PurchaseSelect;

export type OrderPurchaseForAdmin = Prisma.PurchaseGetPayload<{
  select: typeof orderPurchaseSelect;
}>;

export async function getPurchaseFromOrder(orderId: string) {
  await requireAdmin();
  return prisma.purchase.findMany({
    where: { orderId },
    select: orderPurchaseSelect,
  });
}

/**
 * Samma purchase-data som getPurchaseFromOrder, men för alla köp en elev har
 * (kan spänna över flera ordrar), matchar grupperingen i students/page.tsx:
 * en participant äger sina egna köp, annars ägs de av userId direkt.
 */
export async function getPurchasesForStudent(input: {
  userId: string;
  participantId: string | null;
}) {
  await requireAdmin();
  return prisma.purchase.findMany({
    where: input.participantId
      ? { participantId: input.participantId }
      : { userId: input.userId, participantId: null },
    select: orderPurchaseSelect,
  });
}

/**
 * Byter vilken kurs ett enskilt purchaseItem gäller för på en redan beviljad order,
 * t.ex. "Balett ungdom" -> "Balett vuxen" inom samma produkt/pris.
 * Samma bokningshantering som updateOrderItemCourseSelections: bara framtida
 * bokningar tas bort, klipp återställs, och raden raderas/nollställs beroende på
 * om det finns historik kvar.
 */
export async function adminChangePurchaseItemCourse(
  purchaseItemId: string,
  newCourseId: string,
): Promise<{ success: boolean; msg?: string }> {
  await requireAdmin();

  const timeZone = "Europe/Stockholm";
  const now = new TZDate(new Date(), timeZone);

  try {
    return await prisma.$transaction(async (tx) => {
      const purchaseItem = await tx.purchaseItem.findUnique({
        where: { id: purchaseItemId },
        select: {
          id: true,
          courseId: true,
          purchaseId: true,
          orderItemId: true,
          type: true,
          lessonsIncluded: true,
          unlimited: true,
          purchase: {
            select: {
              product: {
                select: {
                  maxCourses: true,
                },
              },
            },
          },
        },
      });

      if (!purchaseItem) {
        return { success: false, msg: "Kursen hittades inte." };
      }

      if (purchaseItem.courseId === newCourseId) {
        return { success: false, msg: "Kursen är redan vald." };
      }

      // Byte är inte begränsat till produktens egna kurskopplingar — de flesta
      // produkter säljs med bara en kurs kopplad, så just det vore poänglöst.
      const newCourse = await tx.course.findUnique({
        where: { id: newCourseId },
        select: { id: true },
      });

      if (!newCourse) {
        return { success: false, msg: "Den valda kursen hittades inte." };
      }

      const duplicate = await tx.purchaseItem.findFirst({
        where: {
          purchaseId: purchaseItem.purchaseId,
          courseId: newCourseId,
        },
      });

      if (duplicate) {
        return {
          success: false,
          msg: "Den valda kursen finns redan i köpet.",
        };
      }

      /*
       * Ta bort gamla kursens purchaseItem. Endast framtida bokningar tas bort.
       */
      const futureBookings = await tx.booking.findMany({
        where: {
          purchaseItemId: purchaseItem.id,
          lesson: { startTime: { gte: now } },
        },
        select: { id: true },
      });

      if (futureBookings.length > 0) {
        await tx.booking.deleteMany({
          where: { id: { in: futureBookings.map((booking) => booking.id) } },
        });

        const restored = await handleClips(
          tx,
          purchaseItem.id,
          futureBookings.length,
        );

        if (!restored.success) {
          throw new Error(
            restored.msg ??
              "Kunde inte återställa saldo efter borttagna bokningar.",
          );
        }
      }

      // Bokningar som redan varit (historik) = redan förbrukade tillfällen av
      // den ursprungliga potten. De ska inte återuppstå som "nya" på den nya kursen.
      const usedCount = await tx.booking.count({
        where: { purchaseItemId: purchaseItem.id },
      });

      if (usedCount === 0) {
        // Om inga bokningar finns kvar alls kan vi radera raden helt
        await tx.purchaseItem.delete({ where: { id: purchaseItem.id } });
      } else {
        // Om det finns historiska bokningar kvar: nollställ alla kvarvarande klipp
        await tx.purchaseItem.update({
          where: { id: purchaseItem.id },
          data: { remainingCount: 0 },
        });
      }

      /*
       * Skapa purchaseItem för nya kursen. Behåller samma pott som den gamla
       * kursen hade (samma produkt/pris, bara annan kurs) minus det som redan
       * använts — annars skulle ett kursbyte kunna trolla fram extra tillfällen.
       */
      const isClip = purchaseItem.type === "CLIP";

      const created = await tx.purchaseItem.create({
        data: {
          purchaseId: purchaseItem.purchaseId,
          orderItemId: purchaseItem.orderItemId,
          courseId: newCourseId,
          type: purchaseItem.type,
          lessonsIncluded: isClip ? 0 : purchaseItem.lessonsIncluded,
          remainingCount: isClip
            ? 0
            : Math.max(0, purchaseItem.lessonsIncluded - usedCount),
          unlimited: purchaseItem.unlimited,
        },
      });

      // Håll paketvalen i synk om produkten är ett paket med kursval.
      if (purchaseItem.purchase.product.maxCourses != null) {
        await tx.orderItemCourseSelection.deleteMany({
          where: {
            orderItemId: purchaseItem.orderItemId,
            courseId: purchaseItem.courseId,
          },
        });

        await tx.orderItemCourseSelection.createMany({
          data: [
            {
              orderItemId: purchaseItem.orderItemId,
              courseId: newCourseId,
            },
          ],
          skipDuplicates: true,
        });
      }

      await autobook(created.id, tx);

      revalidatePath("/admin/orders");
      revalidatePath("/admin/orders/view");
      revalidatePath("/user");

      return { success: true };
    });
  } catch (error) {
    console.error("adminChangePurchaseItemCourse error:", error);

    return {
      success: false,
      msg: error instanceof Error ? error.message : "Kunde inte byta kurs.",
    };
  }
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
          courseSelections: {
            include: { course: true },
          },
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
