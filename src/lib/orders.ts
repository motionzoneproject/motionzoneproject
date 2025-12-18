import type { Prisma } from "@/generated/prisma/client";
import prisma from "./prisma";

export type OrderItemInput = {
  productId: string;
  count: number;
  price: number; // unit price in currency minor unit (or use decimal number)
};

export async function createOrder(params: {
  userId: string;
  items: OrderItemInput[];
  postalcode?: string;
  note?: string; // optional note to include in first status event
}) {
  const { userId, items, postalcode, note } = params;

  if (!items || items.length === 0) throw new Error("No items provided");

  // Compute total as decimal string to avoid float issues
  const total = items.reduce((acc, it) => acc + it.count * it.price, 0);
  const totalStr = String(total);

  // Create order + items + initial status event atomically
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId,
        postalcode,
        totalPrice: totalStr as unknown as Prisma.Decimal,
        // default status is PENDING_PAYMENT per schema
      },
    });

    await tx.orderItem.createMany({
      data: items.map((it) => ({
        orderId: order.id,
        productId: it.productId,
        count: it.count,
        price: String(it.price) as unknown as Prisma.Decimal,
      })),
      skipDuplicates: true,
    });

    // Seed first status event (from null -> PENDING_PAYMENT)
    await tx.orderStatusEvent.create({
      data: {
        orderId: order.id,
        fromStatus: null,
        toStatus: "PENDING_PAYMENT",
        changedByUserId: userId,
        note,
      },
    });

    return order;
  });

  return result;
}

export async function getOrderById(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      orderItems: {
        include: { product: true },
      },
    },
  });
}
