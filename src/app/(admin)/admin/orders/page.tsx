import { unstable_noStore as noStore, revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { isAdminRole } from "@/lib/actions/admin";
import {
  approveOrder,
  cancelOrder,
  createPurchaseFromOrder,
  deleteOrder,
  markOrderPaid,
} from "@/lib/actions/orders";
import prisma from "@/lib/prisma";
import OrdersView from "./OrdersView";

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "PAID" | "CANCELLED";
const PAGE_SIZE = 10;

export const dynamic = "force-dynamic";
export const revalidate = 0;

type OrderStatus = "PENDING_PAYMENT" | "APPROVED" | "PAID" | "CANCELLED";

type OrderLite = {
  id: string;
  userId: string;
  user?: {
    email?: string | null;
    details?: {
      firstName?: string | null;
      lastName?: string | null;
    } | null;
  } | null;
  orderItems?:
    | {
        id?: string;
        product: { name: string };
        participant?: {
          id: string;
          name: string;
          email: string;
          dateOfBirth: string | Date | null;
        } | null;
      }[]
    | null;
  totalPrice: unknown;
  createdAt: string | Date;
  status?: OrderStatus;
  payMethod: number;
  note: string | null;
};

async function getOrders(): Promise<OrderLite[]> {
  noStore();
  const orders = (await prisma.order.findMany({
    // Always fetch all, then filter in memory to avoid enum mismatch issues
    orderBy: [{ createdAt: "desc" }],
    include: {
      user: { include: { details: true } },
      orderItems: { include: { product: true, participant: true } },
    },
  })) as unknown as OrderLite[];
  return orders;
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  noStore();

  const isAdmin = await isAdminRole();
  if (!isAdmin) return notFound();

  const params = await searchParams;
  const raw = (params?.status || "ALL").toUpperCase();
  const status: StatusFilter = [
    "ALL",
    "PENDING",
    "APPROVED",
    "PAID",
    "CANCELLED",
  ].includes(raw)
    ? (raw as StatusFilter)
    : "ALL";

  const orders = await getOrders();

  async function onApprove(formData: FormData) {
    "use server";
    const orderId = String(formData.get("orderId"));
    const note = formData.get("note")?.toString();
    await approveOrder(orderId, note);
    await createPurchaseFromOrder(orderId);
    revalidatePath("/admin/orders");
  }

  async function onMarkPaid(formData: FormData) {
    "use server";
    const orderId = String(formData.get("orderId"));
    const note = formData.get("note")?.toString();
    await markOrderPaid(orderId, note);
    revalidatePath("/admin/orders");
  }

  async function onCancel(formData: FormData) {
    "use server";
    const orderId = String(formData.get("orderId"));
    const note = formData.get("note")?.toString();
    await cancelOrder(orderId, note);
    revalidatePath("/admin/orders");
  }

  async function onDelete(orderId: string): Promise<boolean> {
    "use server";

    const res = await deleteOrder(orderId);
    revalidatePath("/admin/orders");

    return res.success;
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Ordrar</h1>
      <OrdersView
        orders={orders}
        defaultStatus={status}
        pageSize={PAGE_SIZE}
        onApprove={onApprove}
        onMarkPaid={onMarkPaid}
        onCancel={onCancel}
        onDelete={onDelete}
      />
    </div>
  );
}
