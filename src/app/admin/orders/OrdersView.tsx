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
          name: string;
        } | null;
      }[]
    | null;
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
  const searchInput = sp.get("q")?.toLowerCase() || "";

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
    let result = orders;

    if (active === "PENDING") {
      result = result.filter((o) =>
        ["CREATED", "PENDING_PAYMENT", "AWAITING_APPROVAL"].includes(
          String(o.status),
        ),
      );
    } else if (active !== "ALL") {
      result = result.filter((o) => String(o.status) === active);
    }

    if (searchInput) {
      result = result.filter((o) => {
        const userEmail = o.user?.email?.toLowerCase() || "";
        const userName = `${o.user?.details?.firstName || ""} ${
          o.user?.details?.lastName || ""
        }`.toLowerCase();
        const participantNames =
          o.orderItems
            ?.map((oi) => oi.participant?.name.toLowerCase() || "")
            .join(" ") || "";

        return (
          userEmail.includes(searchInput) ||
          userName.includes(searchInput) ||
          participantNames.includes(searchInput)
        );
      });
    }

    return result;
  }, [orders, active, searchInput]);

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
      default:
        return "bg-muted text-muted-foreground border border-border";
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
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-3 text-sm flex-wrap">
          <form action="/admin/orders" method="GET" className="contents">
            <input type="hidden" name="q" value={searchInput} />
            {tabs.map((t) => (
              <button
                key={t.id}
                type="submit"
                name="status"
                value={t.id}
                aria-current={active === t.id ? "page" : undefined}
                className={`px-3 py-1.5 rounded-full border transition-colors ${
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

        <form
          action="/admin/orders"
          method="GET"
          className="relative w-full md:w-64"
        >
          <input type="hidden" name="status" value={active} />
          <input
            name="q"
            defaultValue={searchInput}
            placeholder="Sök kund eller deltagare..."
            className="w-full bg-card border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-ring outline-none transition-all"
          />
        </form>
      </div>

      <div className="border rounded-lg overflow-hidden mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground border-b">
              <th className="p-3 text-left font-medium">Order</th>
              <th className="p-3 text-left font-medium">Beställare</th>
              <th className="p-3 text-left font-medium">Deltagare</th>
              <th className="p-3 text-left font-medium">Produkter</th>
              <th className="p-3 text-left font-medium">Total</th>
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-left font-medium">Detaljer</th>
              <th className="p-3 text-left font-medium">Åtgärder</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((o) => {
              const participants = Array.from(
                new Set(
                  o.orderItems
                    ?.map((oi) => oi.participant?.name)
                    .filter(Boolean),
                ),
              );

              return (
                <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span className="font-mono text-xs text-muted-foreground">
                        #{o.id.slice(0, 8)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString("sv-SE")}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {o.user?.details?.firstName || o.user?.details?.lastName
                          ? `${o.user.details.firstName ?? ""} ${
                              o.user.details.lastName ?? ""
                            }`.trim()
                          : (o.user?.email ?? o.userId)}
                      </span>
                      {o.user?.details?.firstName && (
                        <span className="text-xs text-muted-foreground">
                          {o.user.email}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {participants.length > 0 ? (
                        participants.map((p, i) => (
                          <span
                            key={`${o.id}-p-${i}`}
                            className="px-1.5 py-0.5 bg-muted text-muted-foreground border border-border rounded text-[10px] font-medium"
                          >
                            {p}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground italic text-xs">
                          Samma som kund
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col max-w-[200px]">
                      {o.orderItems?.slice(0, 2).map((oi) => (
                        <span key={oi.id} className="truncate text-xs">
                          {oi.product.name}
                        </span>
                      ))}
                      {(o.orderItems?.length || 0) > 2 && (
                        <span className="text-[10px] text-muted-foreground">
                          + {(o.orderItems?.length || 0) - 2} till...
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 font-semibold">
                    {String(o.totalPrice)} kr
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusStyles(
                        o.status || "PENDING_PAYMENT",
                      )}`}
                    >
                      {getStatusLabel(o.status || "PENDING_PAYMENT")}
                    </span>
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/admin/orders/view?status=${encodeURIComponent(
                        active,
                      )}&orderId=${encodeURIComponent(o.id)}`}
                      className="text-foreground hover:underline font-medium"
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
                        "PAID",
                      ].includes(o.status || "") && (
                        <form
                          action={onApprove}
                          className="flex items-center gap-2"
                        >
                          <input type="hidden" name="orderId" value={o.id} />
                          <SubmitButton
                            className="px-3 py-1 bg-card border rounded text-xs font-medium transition-colors hover:bg-muted"
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
                          <SubmitButton
                            className="px-3 py-1 bg-card border rounded text-xs font-medium transition-colors hover:bg-muted"
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
