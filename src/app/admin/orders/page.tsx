import { unstable_noStore as noStore, revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { isAdminRole } from "@/lib/actions/admin";
import {
  approveOrder,
  createPurchaseFromOrder,
  markOrderPaid,
} from "@/lib/actions/orders";
import prisma from "@/lib/prisma";
import OrdersView from "./OrdersView";

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "PAID";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type OrderStatus =
  | "CREATED"
  | "PENDING_PAYMENT"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "PAID";

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
    return orders.filter((o) =>
      ["CREATED", "PENDING_PAYMENT", "AWAITING_APPROVAL"].includes(
        String(o.status),
      ),
    );
  }
  return orders.filter((o) => String(o.status) === filter);
}

export default async function Page({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  noStore();
  const isAdmin = await isAdminRole();
  if (!isAdmin) return notFound();

  const raw = (searchParams?.status || "PENDING").toUpperCase();
  const status: StatusFilter = ["ALL", "PENDING", "APPROVED", "PAID"].includes(
    raw,
  )
    ? (raw as StatusFilter)
    : "PENDING";

  const orders = await getOrders("ALL");

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

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Ordrar
        </h1>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl">
          Granska inkomna ordrar, godkänn betalning och följ status.
        </p>
      </div>
      <OrdersView
        orders={orders}
        defaultStatus={status}
        onApprove={onApprove}
        onMarkPaid={onMarkPaid}
      />
    </div>
  );
}
