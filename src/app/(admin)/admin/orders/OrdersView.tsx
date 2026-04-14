"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/money";

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
  onCancel,
}: {
  orders: OrderLite[];
  defaultStatus: string;
  onApprove: (formData: FormData) => void;
  onMarkPaid: (formData: FormData) => void;
  onCancel: (formData: FormData) => void;
}) {
  const sp = useSearchParams();
  const active = (sp.get("status")?.toUpperCase() || defaultStatus).toString();
  const searchInput = sp.get("q")?.toLowerCase() || "";
  const participantId = sp.get("participantId") || "";
  const clearParticipantHref = useMemo(() => {
    const params = new URLSearchParams(sp.toString());
    params.delete("participantId");
    const query = params.toString();
    return query ? `/admin/orders?${query}` : "/admin/orders";
  }, [sp]);

  const counts = useMemo(() => {
    const acc: Record<string, number> = {
      ALL: 0,
      PENDING: 0,
      APPROVED: 0,
      PAID: 0,
      CANCELLED: 0,
    };
    for (const o of orders) {
      const st = String(o.status || "PENDING_PAYMENT");
      if (st === "PENDING_PAYMENT") {
        acc.PENDING += 1;
      } else if (st === "APPROVED") {
        acc.APPROVED += 1;
      } else if (st === "PAID") {
        acc.PAID += 1;
      } else if (st === "CANCELLED") {
        acc.CANCELLED += 1;
      }
      acc.ALL += 1;
    }
    return acc;
  }, [orders]);

  const filtered = useMemo(() => {
    let result = orders;

    if (active === "PENDING") {
      result = result.filter((o) => String(o.status) === "PENDING_PAYMENT");
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

    if (participantId) {
      result = result.filter((o) =>
        o.orderItems?.some((oi) => oi.participant?.id === participantId),
      );
    }

    return result;
  }, [orders, active, searchInput, participantId]);

  const tabs = [
    { id: "ALL", label: "Alla" },
    { id: "PENDING", label: "Väntar" },
    { id: "PAID", label: "Betalda" },
    { id: "APPROVED", label: "Godkända" },
    { id: "CANCELLED", label: "Avbrutna" },
  ];

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING_PAYMENT":
        return "Väntar betalning";
      case "APPROVED":
        return "Godkänd";
      case "PAID":
        return "Betald";
      case "CANCELLED":
        return "Avbruten";
      default:
        return status;
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "PENDING_PAYMENT":
        return "bg-amber-500/10 text-amber-500";
      case "APPROVED":
        return "bg-emerald-500/10 text-emerald-500";
      case "PAID":
        return "bg-blue-500/10 text-blue-500";
      case "CANCELLED":
        return "bg-rose-500/10 text-rose-500";
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
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-3 text-sm flex-wrap">
          <form action="/admin/orders" method="GET" className="contents">
            <input type="hidden" name="q" value={searchInput} />
            <input type="hidden" name="participantId" value={participantId} />
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

        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
          {participantId ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <div>
                <span className="text-muted-foreground">
                  Visar endast participantId:
                </span>
                <br />
                <span className="font-mono text-xs">{participantId}</span>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                <Link href={clearParticipantHref}>X</Link>
              </Button>
            </div>
          ) : null}
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
              className="w-full bg-card border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand outline-none transition-all"
            />
          </form>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border">
        <table className="min-w-[1100px] w-full text-sm">
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
                            className="px-1.5 py-0.5 bg-brand/10 text-brand rounded text-[10px] font-medium"
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
                    {formatPrice(Number(o.totalPrice))}
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
                      className="text-blue-500 hover:underline font-medium"
                    >
                      Visa
                    </Link>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {active !== "PENDING" &&
                        ["PAID"].includes(o.status || "") && (
                          <form
                            action={onApprove}
                            className="flex items-center gap-2"
                          >
                            <input type="hidden" name="orderId" value={o.id} />
                            <SubmitButton
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition-colors"
                              pendingText="..."
                            >
                              Godkänn
                            </SubmitButton>
                          </form>
                        )}
                      {active !== "APPROVED" &&
                        ["PENDING_PAYMENT"].includes(o.status || "") && (
                          <form
                            action={onMarkPaid}
                            className="flex items-center gap-2"
                          >
                            <input type="hidden" name="orderId" value={o.id} />
                            <SubmitButton
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                              pendingText="..."
                            >
                              Betald
                            </SubmitButton>
                          </form>
                        )}
                      {["PENDING_PAYMENT"].includes(o.status || "") && (
                        <form
                          action={onCancel}
                          className="flex items-center gap-2"
                        >
                          <input type="hidden" name="orderId" value={o.id} />
                          <SubmitButton
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-medium transition-colors"
                            pendingText="..."
                          >
                            Avbryt
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
