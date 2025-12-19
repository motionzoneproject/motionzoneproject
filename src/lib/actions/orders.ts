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
