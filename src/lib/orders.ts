import type { PrismaTx } from "./actions/admin";
import prisma from "./prisma";
import { getProductSpotsLeft } from "./product-capacity";

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
  },
) {
  const { userId, items, postalcode, note } = params;

  if (!items || items.length === 0) throw new Error("No items provided");

  // All prices are integers in öre — plain integer arithmetic, no rounding needed
  const total = items.reduce((acc, it) => acc + it.count * it.price, 0);
  const productCounts = new Map<string, number>();

  for (const item of items) {
    productCounts.set(
      item.productId,
      (productCounts.get(item.productId) ?? 0) + item.count,
    );
  }

  const productIds = Array.from(productCounts.keys());
  const products = await tx.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      maxCustomer: true,
      unlimitedCustomers: true,
      countCustomer: true,
    },
  });
  const productsById = new Map(
    products.map((product) => [product.id, product]),
  );

  for (const [productId, requestedCount] of productCounts) {
    const product = productsById.get(productId);

    if (!product) {
      throw new Error(`Product ${productId} was not found. Order cancelled.`);
    }

    if (getProductSpotsLeft(product) < requestedCount) {
      throw new Error(
        `Product count exceeds limit for product ${productId}. Count was ${requestedCount}.`,
      );
    }

    if (product.unlimitedCustomers) {
      await tx.product.update({
        where: { id: productId },
        data: { countCustomer: { increment: requestedCount } },
      });
      continue;
    }

    const updated = await tx.product.updateMany({
      where: {
        id: productId,
        countCustomer: {
          lte: product.maxCustomer - requestedCount,
        },
      },
      data: {
        countCustomer: { increment: requestedCount },
      },
    });

    if (updated.count === 0) {
      throw new Error(
        `Product count exceeds limit for product ${productId}. Count was ${requestedCount}.`,
      );
    }
  }

  // Create order + items + initial status event atomically

  const orderResult = await tx.order.create({
    data: {
      userId,
      postalcode,
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
