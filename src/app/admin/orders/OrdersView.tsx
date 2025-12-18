"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useFormStatus } from "react-dom";

type OrderStatus =
  | "CREATED"
  | "PENDING_PAYMENT"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "PAID";

type OrderLite = {
  id: string;
  userId: string;
  user?: { email?: string | null } | null;
  totalPrice: unknown;
  createdAt: string | Date;
  status?: OrderStatus;
};

export default function OrdersView({
  orders,
  defaultStatus,
  onApprove,
  onMarkPaid,
}: {
  orders: OrderLite[];
  defaultStatus: string;
  onApprove: (formData: FormData) => void;
  onMarkPaid: (formData: FormData) => void;
}) {
  const sp = useSearchParams();
  const active = (sp.get("status")?.toUpperCase() || defaultStatus).toString();

  const counts = useMemo(() => {
    const acc: Record<string, number> = { ALL: 0 };
    for (const o of orders) {
      const st = String(o.status || "PENDING_PAYMENT");
      acc[st] = (acc[st] || 0) + 1;
      acc.ALL += 1;
    }
    return acc;
  }, [orders]);

  const filtered = useMemo(() => {
    if (!active || active === "ALL") return orders;
    return orders.filter((o) => String(o.status) === active);
  }, [orders, active]);

  const tabs = [
    "PENDING_PAYMENT",
    "AWAITING_APPROVAL",
    "APPROVED",
    "PAID",
    "ALL",
  ];

  function SubmitButton({
    children,
    className,
    pendingText,
  }: {
    children: React.ReactNode;
    className: string;
    pendingText: string;
  }) {
    const { pending } = useFormStatus();
    return (
      <button type="submit" disabled={pending} className={className}>
        {pending ? pendingText : children}
      </button>
    );
  }

  return (
    <>
      <div className="flex gap-3 text-sm">
        <form action="/admin/orders" method="GET" className="contents">
          {tabs.map((s) => (
            <button
              key={s}
              type="submit"
              name="status"
              value={s}
              aria-current={active === s ? "page" : undefined}
              className={`px-2 py-1 rounded border ${
                active === s ? "bg-gray-900 text-white" : "bg-white"
              }`}
            >
              {s}
              {typeof counts[s] === "number" ? ` (${counts[s]})` : ""}
            </button>
          ))}
        </form>
      </div>

      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-gray-50">
            <th className="p-2 text-left">Order</th>
            <th className="p-2 text-left">Kund</th>
            <th className="p-2 text-left">Total</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Skapad</th>
            <th className="p-2 text-left">Detaljer</th>
            <th className="p-2 text-left">Åtgärder</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((o) => (
            <tr key={o.id} className="border-t">
              <td className="p-2 font-mono">{o.id}</td>
              <td className="p-2">{o.user?.email ?? o.userId}</td>
              <td className="p-2">{String(o.totalPrice)}</td>
              <td className="p-2">{o.status ?? "PENDING_PAYMENT"}</td>
              <td className="p-2">{new Date(o.createdAt).toLocaleString()}</td>
              <td className="p-2">
                <Link
                  href={`/admin/orders/view?status=${encodeURIComponent(
                    active
                  )}&orderId=${encodeURIComponent(o.id)}`}
                  className="underline text-blue-600"
                >
                  Visa
                </Link>
              </td>
              <td className="p-2">
                <div className="flex gap-2">
                  <form action={onApprove} className="flex items-center gap-2">
                    <input type="hidden" name="orderId" value={o.id} />
                    <input
                      name="note"
                      placeholder="Notering (valfritt)"
                      className="border px-2 py-1 text-xs"
                    />
                    <SubmitButton
                      className="px-2 py-1 bg-emerald-600 text-white rounded"
                      pendingText="Uppdaterar…"
                    >
                      Godkänn
                    </SubmitButton>
                  </form>
                  <form action={onMarkPaid} className="flex items-center gap-2">
                    <input type="hidden" name="orderId" value={o.id} />
                    <input
                      name="note"
                      placeholder="Notering (valfritt)"
                      className="border px-2 py-1 text-xs"
                    />
                    <SubmitButton
                      className="px-2 py-1 bg-blue-600 text-white rounded"
                      pendingText="Uppdaterar…"
                    >
                      Betald
                    </SubmitButton>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
