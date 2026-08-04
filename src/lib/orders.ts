import type { PrismaTx } from "./actions/admin";
import prisma from "./prisma";

export type OrderItemInput = {
  productId: string;
  count: number;
  price: number; // unit price in currency minor unit (or use decimal number)
  participantId?: string | null;
  /** Populated for PACK products with maxCourses – saved as OrderItemCourseSelection */
  selectedCourseIds?: string[];
};

export async function createOrder(
  tx: PrismaTx,
  params: {
    userId: string;
    items: OrderItemInput[];
    postalcode?: string;
    note?: string; // optional note to include in first status event
    paymethod?: number;
  },
) {
  const { userId, items, postalcode, note, paymethod } = params;

  if (!items || items.length === 0) throw new Error("No items provided");

  // All prices are integers in öre — plain integer arithmetic, no rounding needed
  const total = items.reduce((acc, it) => acc + it.count * it.price, 0);

  // Create order + items + initial status event atomically

  const orderResult = await tx.order.create({
    data: {
      userId,
      postalcode,
      note,
      payMethod: paymethod || 1,
      totalPrice: total,
      // default status is PENDING_PAYMENT per schema
    },
  });

  await tx.orderItem.createMany({
    data: items.map((it) => ({
      orderId: orderResult.id,
      productId: it.productId,
      count: it.count,
      price: it.price,
      participantId: it.participantId || null,
    })),
    skipDuplicates: true,
  });

  // Save course selections (OrderItemCourseSelection) for PACK products with maxCourses
  const itemsWithCourses = items.filter(
    (it) => it.selectedCourseIds && it.selectedCourseIds.length > 0,
  );

  if (itemsWithCourses.length > 0) {
    // Fetch back the created orderItems to get their IDs
    const createdOrderItems = await tx.orderItem.findMany({
      where: { orderId: orderResult.id },
      select: { id: true, productId: true },
    });

    // Build a map productId → orderItemId (one-to-one here since we split by participant)
    // If same productId appears multiple times we match in order
    const productIdToOrderItemIds = new Map<string, string[]>();
    for (const oi of createdOrderItems) {
      const existing = productIdToOrderItemIds.get(oi.productId) ?? [];
      existing.push(oi.id);
      productIdToOrderItemIds.set(oi.productId, existing);
    }
    // Track consumption index per productId to handle qty > 1 correctly
    const consumedIndex = new Map<string, number>();

    const courseSelectionRows: { orderItemId: string; courseId: string }[] = [];
    for (const it of itemsWithCourses) {
      const available = productIdToOrderItemIds.get(it.productId) ?? [];
      const idx = consumedIndex.get(it.productId) ?? 0;
      const orderItemId = available[idx];
      consumedIndex.set(it.productId, idx + 1);

      if (!orderItemId) continue;

      for (const courseId of it.selectedCourseIds ?? []) {
        courseSelectionRows.push({ orderItemId, courseId });
      }
    }

    if (courseSelectionRows.length > 0) {
      await tx.orderItemCourseSelection.createMany({
        data: courseSelectionRows,
        skipDuplicates: true,
      });
    }
  }

  // Seed first status event (from null -> PENDING_PAYMENT)
  await tx.orderStatusEvent.create({
    data: {
      orderId: orderResult.id,
      fromStatus: null,
      toStatus: "PENDING_PAYMENT",
      changedByUserId: userId,
      note,
    },
  });

  return orderResult;
}

export async function getOrderById(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
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
  });
}
