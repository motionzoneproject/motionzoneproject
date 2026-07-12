import type { PrismaTx } from "./actions/admin";
import prisma from "./prisma";

export type OrderItemInput = {
  productId: string;
  count: number;
  price: number; // unit price in currency minor unit (or use decimal number)
  participantId?: string | null;
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
        include: { product: true, participant: true },
      },
    },
  });
}
