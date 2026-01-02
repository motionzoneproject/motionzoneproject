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
  user?: {
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
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
    const acc: Record<string, number> = {
      ALL: 0,
      PENDING: 0,
      APPROVED: 0,
      PAID: 0,
    };
    for (const o of orders) {
      const st = String(o.status || "PENDING_PAYMENT");
      if (["CREATED", "PENDING_PAYMENT", "AWAITING_APPROVAL"].includes(st)) {
        acc.PENDING += 1;
      } else if (st === "APPROVED") {
        acc.APPROVED += 1;
      } else if (st === "PAID") {
        acc.PAID += 1;
      }
      acc.ALL += 1;
    }
    return acc;
  }, [orders]);

  const filtered = useMemo(() => {
    if (!active || active === "ALL") return orders;
    if (active === "PENDING") {
      return orders.filter((o) =>
        ["CREATED", "PENDING_PAYMENT", "AWAITING_APPROVAL"].includes(
          String(o.status),
        ),
      );
    }
    return orders.filter((o) => String(o.status) === active);
  }, [orders, active]);

  const tabs = [
    { id: "PENDING", label: "Väntar" },
    { id: "APPROVED", label: "Godkända" },
    { id: "PAID", label: "Betalda" },
    { id: "ALL", label: "Alla" },
  ];

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "CREATED":
        return "Skapad";
      case "PENDING_PAYMENT":
        return "Väntar betalning";
      case "AWAITING_APPROVAL":
        return "Väntar godkännande";
      case "APPROVED":
        return "Godkänd";
      case "PAID":
        return "Betald";
      default:
        return status;
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "CREATED":
      case "PENDING_PAYMENT":
      case "AWAITING_APPROVAL":
        return "bg-amber-500/10 text-amber-500";
      case "APPROVED":
        return "bg-emerald-500/10 text-emerald-500";
      case "PAID":
        return "bg-blue-500/10 text-blue-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

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
          {tabs.map((t) => (
            <button
              key={t.id}
              type="submit"
              name="status"
              value={t.id}
              aria-current={active === t.id ? "page" : undefined}
              className={`px-2 py-1 rounded border transition-colors ${
                active === t.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground hover:bg-muted"
              }`}
            >
              {t.label}
              {typeof counts[t.id] === "number" ? ` (${counts[t.id]})` : ""}
            </button>
          ))}
        </form>
      </div>

      <div className="border rounded-lg overflow-hidden mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground border-b">
              <th className="p-3 text-left font-medium">Order</th>
              <th className="p-3 text-left font-medium">Kund</th>
              <th className="p-3 text-left font-medium">Total</th>
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-left font-medium">Skapad</th>
              <th className="p-3 text-left font-medium">Detaljer</th>
              <th className="p-3 text-left font-medium">Åtgärder</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((o) => {
              // const purchase = await getPurchaseFromOrder(o.id);
              return (
                <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-mono text-xs">
                    {o.id.slice(0, 8)}...
                  </td>
                  <td className="p-3">
                    {o.user?.firstName || o.user?.lastName
                      ? `${o.user.firstName ?? ""} ${
                          o.user.lastName ?? ""
                        }`.trim()
                      : (o.user?.email ?? o.userId)}
                  </td>
                  <td className="p-3 font-medium">{String(o.totalPrice)} kr</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusStyles(
                        o.status || "PENDING_PAYMENT",
                      )}`}
                    >
                      {getStatusLabel(o.status || "PENDING_PAYMENT")}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(o.createdAt).toLocaleString("sv-SE")}
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/admin/orders/view?status=${encodeURIComponent(
                        active,
                      )}&orderId=${encodeURIComponent(o.id)}`}
                      className="text-blue-500 hover:underline font-medium"
                    >
                      Visa
                    </Link>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {[
                        "CREATED",
                        "PENDING_PAYMENT",
                        "AWAITING_APPROVAL",
                      ].includes(o.status || "") && (
                        <form
                          action={onApprove}
                          className="flex items-center gap-2"
                        >
                          <input type="hidden" name="orderId" value={o.id} />
                          <input
                            name="note"
                            placeholder="Notering"
                            className="bg-background border rounded px-2 py-1 text-xs w-24 focus:ring-1 focus:ring-brand"
                          />
                          <SubmitButton
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition-colors"
                            pendingText="..."
                          >
                            Godkänn
                          </SubmitButton>
                        </form>
                      )}
                      {[
                        "CREATED",
                        "PENDING_PAYMENT",
                        "AWAITING_APPROVAL",
                        "APPROVED",
                      ].includes(o.status || "") && (
                        <form
                          action={onMarkPaid}
                          className="flex items-center gap-2"
                        >
                          <input type="hidden" name="orderId" value={o.id} />
                          <input
                            name="note"
                            placeholder="Notering"
                            className="bg-background border rounded px-2 py-1 text-xs w-24 focus:ring-1 focus:ring-brand"
                          />
                          <SubmitButton
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                            pendingText="..."
                          >
                            Betald
                          </SubmitButton>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
