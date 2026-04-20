import { unstable_noStore as noStore, revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { isAdminRole } from "@/lib/actions/admin-shared";
import {
  approveOrder,
  cancelOrder,
  createPurchaseFromOrder,
  markOrderPaid,
} from "@/lib/actions/orders";
import prisma from "@/lib/prisma";
import OrdersView from "./OrdersView";

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "PAID" | "CANCELLED";

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
        product: { name: string };
        participant?: {
          id: string;
          name: string;
        } | null;
      }[]
    | null;
  totalPrice: unknown;
  createdAt: string | Date;
  status?: OrderStatus;
};

async function getOrders(filter: StatusFilter): Promise<OrderLite[]> {
  noStore();
  const orders = (await prisma.order.findMany({
    // Always fetch all, then filter in memory to avoid enum mismatch issues
    orderBy: [{ createdAt: "desc" }],
    include: {
      user: { include: { details: true } },
      orderItems: { include: { product: true, participant: true } },
    },
  })) as unknown as OrderLite[];

  if (!filter || filter === "ALL") return orders;
  if (filter === "PENDING") {
    return orders.filter((o) => String(o.status) === "PENDING_PAYMENT");
  }
  return orders.filter((o) => String(o.status) === filter);
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

  const orders = await getOrders("ALL");

  async function onApprove(formData: FormData) {
    "use server";
    const orderId = String(formData.get("orderId"));
    const note = formData.get("note")?.toString();
    await approveOrder(orderId, note);
    await createPurchaseFromOrder(orderId); // fix: kanske se så purchase är skapad osv.
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

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Ordrar</h1>
      <OrdersView
        orders={orders}
        defaultStatus={status}
        onApprove={onApprove}
        onMarkPaid={onMarkPaid}
        onCancel={onCancel}
      />
    </div>
  );
}
