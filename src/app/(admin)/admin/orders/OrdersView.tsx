"use client";

import {
  AlertTriangle,
  CheckIcon,
  ChevronDown,
  DollarSignIcon,
  SearchIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { PaginationBar } from "@/components/PaginationBar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Course } from "@/generated/prisma/client";
import type { OrderEditPayload } from "@/lib/actions/orders";
import type { ParticipantData } from "@/lib/actions/participants";
import { calculateAge, formatDateToInputStr } from "@/lib/date-utils";
import { formatPrice } from "@/lib/money";
import { getOrderStatusLabel, type OrderStatus } from "@/lib/order-status";
import { getCourseName, getPayMethodTxt } from "@/lib/tools";
import CancelOrderBtn from "./components/CancelOrderBtn";
import DeleteOrderBtn from "./components/DeleteOrderBtn";
import {
  type EditableProduct,
  EditOrderDialog,
} from "./components/EditOrderDialog";
import { OrderPackageDialog } from "./components/OrderPackageEditor";

type OrderLite = {
  id: string;
  userId: string;
  isPaid?: boolean;
  paidAt?: string | Date | null;
  user?: {
    email?: string | null;
    details?: {
      firstName?: string | null;
      lastName?: string | null;
      dateOfBirth?: string | Date | null;
    } | null;
  } | null;
  orderItems?:
    | {
        id?: string;
        order: { id: string };
        product: {
          id: string;
          name: string;
          price: number;
          maxCourses?: number | null;
          courses?: { course: Course }[];
        };
        participant?: {
          id: string;
          dateOfBirth: string | Date | null;
          email: string;
          name: string;
        } | null;
        courseSelections?: { course: Course }[] | null;
      }[]
    | null;
  totalPrice: unknown;
  payMethod: number;
  note: string | null;
  createdAt: string | Date;
  status?: OrderStatus;
};

export default function OrdersView({
  orders,
  products,
  defaultStatus,
  pageSize,
  onApprove,
  onMarkPaid,
  onTogglePaid,
  onCancel,
  onDelete,
  onSavePackage,
  onUpdateOrder,
  getParticipantsForUser,
  createParticipant,
}: {
  orders: OrderLite[];
  products: EditableProduct[];
  defaultStatus: string;
  pageSize: number;
  onApprove: (formData: FormData) => void;
  onMarkPaid: (formData: FormData) => void;
  onTogglePaid: (orderId: string, paid: boolean) => void | Promise<void>;
  onCancel: (formData: FormData) => void;
  onDelete: (orderId: string) => boolean | Promise<boolean>;
  onUpdateOrder: (
    orderId: string,
    payload: OrderEditPayload,
  ) => Promise<{ success: boolean; msg?: string }>;
  getParticipantsForUser: (
    userId: string,
  ) => Promise<{ id: string; name: string; email: string | null }[]>;
  createParticipant: (
    data: ParticipantData,
  ) => Promise<{ id: string; name: string }>;
  onSavePackage: (
    ordeerId: string,
    orderItemId: string,
    selectedCourseIds: string[],
  ) =>
    | Promise<{ success: boolean; msg?: string }>
    | { success: boolean; msg: string };
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const active = (sp.get("status")?.toUpperCase() || defaultStatus).toString();
  const paidFilterParam = sp.get("paid")?.toUpperCase();
  const paidFilter =
    paidFilterParam === "PAID" || paidFilterParam === "UNPAID"
      ? paidFilterParam
      : "ALL";
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [pendingApprovalOrder, setPendingApprovalOrder] =
    useState<OrderLite | null>(null);

  const executeApprove = (orderId: string) => {
    const formData = new FormData();
    formData.set("orderId", orderId);
    setApprovingOrderId(orderId);

    startTransition(async () => {
      try {
        await onApprove(formData);
        router.refresh();
      } catch (error) {
        const message =
          (error as { message?: string })?.message ||
          "Kunde inte godkänna ordern.";
        toast.error(message);
      } finally {
        setApprovingOrderId(null);
        setPendingApprovalOrder(null);
      }
    });
  };

  const searchInput = sp.get("q")?.toLowerCase() || "";
  const participantId = sp.get("participantId") || "";
  const requestedPage = Math.max(1, Number(sp.get("page")) || 1);

  const clearParticipantHref = useMemo(() => {
    const params = new URLSearchParams(sp.toString());
    params.delete("participantId");
    params.delete("page");
    const query = params.toString();
    return query ? `/admin/orders?${query}` : "/admin/orders";
  }, [sp]);

  const detailBaseQuery = useMemo(() => {
    const params = new URLSearchParams(sp.toString());
    params.delete("orderId");
    return params;
  }, [sp]);

  const counts = useMemo(() => {
    const acc: Record<string, number> = {
      ALL: 0,
      PENDING: 0,
      APPROVED: 0,
      CANCELLED: 0,
    };
    for (const o of orders) {
      const st = String(o.status || "PENDING_PAYMENT");
      if (st === "PENDING_PAYMENT") acc.PENDING += 1;
      else if (st === "APPROVED") acc.APPROVED += 1;
      else if (st === "CANCELLED") acc.CANCELLED += 1;
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
      // Tvinga i lowercase och ta bort '#' om användaren skrev t.ex. "#e5ae07b8"
      const query = searchInput.toLowerCase().trim().replace("#", "");

      result = result.filter((o) => {
        const orderId = o.id.toLowerCase();
        const userEmail = o.user?.email?.toLowerCase() || "";
        const userName = `${o.user?.details?.firstName || ""} ${
          o.user?.details?.lastName || ""
        }`.toLowerCase();
        const participantNames =
          o.orderItems
            ?.map((oi) => oi.participant?.name.toLowerCase() || "")
            .join(" ") || "";

        return (
          orderId.includes(query) ||
          userEmail.includes(query) ||
          userName.includes(query) ||
          participantNames.includes(query)
        );
      });
    }

    if (participantId) {
      result = result.filter((o) =>
        o.orderItems?.some((oi) => oi.participant?.id === participantId),
      );
    }

    if (paidFilter === "PAID") {
      result = result.filter((o) => o.isPaid);
    } else if (paidFilter === "UNPAID") {
      result = result.filter((o) => !o.isPaid);
    }

    return result;
  }, [orders, active, searchInput, participantId, paidFilter]);

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const paginatedOrders = filtered.slice(pageStart, pageEnd);

  const createOrderDetailHref = (orderId: string) => {
    const params = new URLSearchParams(detailBaseQuery.toString());
    params.set("orderId", orderId);
    return `/admin/orders/view?${params.toString()}`;
  };

  const tabs = [
    { id: "ALL", label: "Alla" },
    { id: "PENDING", label: "Väntar" },
    { id: "APPROVED", label: "Beviljade" },
    { id: "CANCELLED", label: "Avbrutna" },
  ];

  const handleApprove = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);

    if (order) {
      const hasUnselectedPackage = order.orderItems?.some((oi) => {
        const isPackage = (oi.product?.maxCourses ?? 0) > 0;
        const hasSelections = (oi.courseSelections?.length ?? 0) > 0;
        return isPackage && !hasSelections;
      });

      if (hasUnselectedPackage) {
        toast.error("Kan inte bevilja ordern: Minst ett paketval saknas.");
        return;
      }

      const hasLess = order.orderItems?.some((oi) => {
        const maxCourses = oi.product?.maxCourses ?? 0;
        const currentSelections = oi.courseSelections?.length ?? 0;
        return maxCourses > 0 && currentSelections < maxCourses;
      });

      if (hasLess) {
        setPendingApprovalOrder(order);
        return;
      }
    }

    executeApprove(orderId);
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "PENDING_PAYMENT":
        return "bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30";
      case "APPROVED":
        return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30";
      case "CANCELLED":
        return "bg-rose-500/15 text-rose-800 dark:text-rose-400 border border-rose-500/30";
      default:
        return "bg-muted text-muted-foreground border border-border";
    }
  };

  const updatePaidFilter = (value: string) => {
    const params = new URLSearchParams(sp.toString());
    params.delete("page");
    if (value === "ALL") {
      params.delete("paid");
    } else {
      params.set("paid", value);
    }
    const query = params.toString();
    router.push(query ? `/admin/orders?${query}` : "/admin/orders");
  };

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col gap-2 text-sm">
          <form
            action="/admin/orders"
            method="GET"
            className="flex flex-wrap gap-2"
          >
            <input type="hidden" name="page" value="1" />
            <input type="hidden" name="q" value={searchInput} />
            <input type="hidden" name="participantId" value={participantId} />
            <input type="hidden" name="paid" value={paidFilter} />
            {tabs.map((t) => (
              <button
                key={t.id}
                type="submit"
                name="status"
                value={t.id}
                aria-current={active === t.id ? "page" : undefined}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-all ${
                  active === t.id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground hover:bg-muted border-border"
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
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-xs">
              <div>
                <span className="text-muted-foreground">
                  Filtrerar på deltagare:
                </span>{" "}
                <span className="font-mono">{participantId}</span>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-5 w-5 p-0">
                <Link href={clearParticipantHref}>×</Link>
              </Button>
            </div>
          ) : null}
          <div className="flex items-center gap-2 text-xs md:w-auto">
            <span className="text-muted-foreground whitespace-nowrap">
              Betalning:
            </span>
            <Select value={paidFilter} onValueChange={updatePaidFilter}>
              <SelectTrigger
                size="sm"
                className="h-8 w-28 bg-card border-border text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="ALL">Alla</SelectItem>
                <SelectItem value="PAID">Betalda</SelectItem>
                <SelectItem value="UNPAID">Obetalda</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <form
            action="/admin/orders"
            method="GET"
            className="relative w-full md:w-56 flex"
          >
            <input type="hidden" name="status" value={active} />
            <input type="hidden" name="paid" value={paidFilter} />
            <input type="hidden" name="page" value="1" />
            <input
              name="q"
              defaultValue={searchInput}
              placeholder="Sök order, kund..."
              className="w-full bg-card border border-border rounded-md px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground"
            />
            <Button type="submit">
              <SearchIcon />
            </Button>
          </form>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-muted-foreground uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4 font-semibold min-w-[220px]">
                Order & Kund
              </th>
              <th className="py-3 px-4 font-semibold min-w-[260px]">
                Produkter & Paket
              </th>
              <th className="py-3 px-4 font-semibold min-w-[210px]">
                Status & Betalning
              </th>
              <th className="py-3 px-4 font-semibold text-right w-[150px]">
                Åtgärder
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {paginatedOrders.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="py-10 text-center text-muted-foreground"
                >
                  Inga ordrar hittades.
                </td>
              </tr>
            )}
            {paginatedOrders.map((o) => {
              const canMarkPaid = ["PENDING_PAYMENT", "APPROVED"].includes(
                o.status || "",
              );
              const canEditOrder = o.status !== "APPROVED";
              const customerLabel =
                o.user?.details?.firstName || o.user?.details?.lastName
                  ? `${o.user.details.firstName ?? ""} ${
                      o.user.details.lastName ?? ""
                    }`.trim()
                  : (o.user?.email ?? "Kunden");
              const participants = Array.from(
                new Map(
                  (o.orderItems ?? [])
                    .map((oi) => oi.participant)
                    .filter((p): p is NonNullable<typeof p> => !!p)
                    .map((p) => [p.id, p]),
                ).values(),
              );

              return (
                <tr
                  key={o.id}
                  className="hover:bg-muted/30 transition-colors border-b-3"
                >
                  {/* Kolumn 1: Order & Kund */}
                  <td className="py-4 px-4 align-top">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-foreground">
                          #{o.id.slice(0, 8)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateToInputStr(new Date(o.createdAt))}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block">
                          Beställare
                        </span>
                        <div className="font-medium text-foreground text-xs">
                          {customerLabel}{" "}
                          <span className="text-muted-foreground font-normal">
                            ({calculateAge(o.user?.details?.dateOfBirth)} år)
                          </span>
                        </div>
                        {o.user?.details?.firstName && (
                          <span className="text-[11px] text-muted-foreground block truncate">
                            {o.user.email}
                          </span>
                        )}
                      </div>

                      {participants.length > 0 && (
                        <div className="space-y-0.5 pt-1 border-t border-border/40">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block">
                            Deltagare
                          </span>
                          {participants.map((p, i) => (
                            <div key={`${o.id}-p-${i}`} className="text-xs">
                              <span className="font-medium text-foreground">
                                {p.name}
                              </span>{" "}
                              <span className="text-muted-foreground text-[10px]">
                                ({calculateAge(p.dateOfBirth)} år)
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Kolumn 2: Produkter och Paket med Deltagarnamn */}
                  <td className="py-4 px-4 align-top">
                    <div className="space-y-3">
                      {(o.orderItems ?? []).map((oi) => {
                        const courseOptions =
                          oi.product.courses?.map((c) => c.course) ?? [];
                        const selections =
                          oi.courseSelections?.flatMap((sel) =>
                            sel.course ? [getCourseName(sel.course)] : [],
                          ) ?? [];
                        const selectedIds =
                          oi.courseSelections?.flatMap((sel) =>
                            sel.course?.id ? [sel.course.id] : [],
                          ) ?? [];
                        const maxCourses = oi.product?.maxCourses ?? 0;
                        const isPackage = maxCourses > 0;
                        const canEdit = o.status !== "CANCELLED";
                        const participantName = oi.participant?.name;

                        return (
                          <div
                            key={oi.id || `${o.id}-item`}
                            className="space-y-1 text-xs border-b border-border/40 last:border-0 pb-2 last:pb-0"
                          >
                            <div className="font-semibold text-foreground">
                              {oi.product.name}
                            </div>

                            {participantName && (
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <UserIcon className="h-3 w-3 shrink-0" />
                                <span>Deltagare:</span>
                                <span className="font-medium text-foreground">
                                  {participantName}
                                </span>
                              </div>
                            )}

                            {isPackage && (
                              <details className="group rounded-md bg-muted/40 border border-border text-xs mt-1">
                                <summary className="flex cursor-pointer items-center justify-between py-1 px-2 font-medium text-muted-foreground select-none hover:text-foreground text-[11px]">
                                  <span>
                                    Paketval ({selections.length}/{maxCourses})
                                  </span>
                                  <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180 opacity-70" />
                                </summary>
                                <div className="space-y-1.5 border-t border-border p-2 bg-card">
                                  {selections.length === 0 ? (
                                    <span className="text-[10px] text-muted-foreground italic block">
                                      Inga paketval sparade
                                    </span>
                                  ) : (
                                    selections.map((courseName, idx) => (
                                      <span
                                        key={`${oi.id}-${courseName}-${idx}`}
                                        className="truncate text-[11px] text-muted-foreground block"
                                      >
                                        • {courseName}
                                      </span>
                                    ))
                                  )}

                                  <div className="pt-1">
                                    <OrderPackageDialog
                                      orderId={oi.order.id}
                                      orderItemId={oi.id ?? ""}
                                      productName={
                                        oi.product?.name ?? "Produkt"
                                      }
                                      maxCourses={maxCourses}
                                      courses={courseOptions}
                                      selected={selectedIds}
                                      onSave={async (orderItemId, next) => {
                                        try {
                                          const res = await onSavePackage(
                                            oi.order.id,
                                            orderItemId,
                                            next,
                                          );
                                          if (res?.success) {
                                            toast.success(
                                              "Paketvalen har sparats!",
                                            );
                                          } else {
                                            toast.error(
                                              res?.msg ||
                                                "Kunde inte spara paketvalen.",
                                            );
                                          }
                                        } catch (err) {
                                          const msg =
                                            (err as { message?: string })
                                              ?.message ||
                                            "Ett fel uppstod när paketvalen skulle sparas.";
                                          toast.error(msg);
                                        }
                                      }}
                                      disabled={!canEdit}
                                      readOnlyMessage="Paketvalet går inte att ändra när ordern är avbruten."
                                      triggerLabel="Ändra paket"
                                    />
                                  </div>
                                </div>
                              </details>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </td>

                  {/* Kolumn 3: Status & Betalning (Korrigerad kontrast) */}
                  <td className="py-4 px-4 align-top">
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-bold text-foreground">
                          {formatPrice(Number(o.totalPrice))}
                        </span>
                        <Link
                          href={createOrderDetailHref(o.id)}
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          Visa detaljer →
                        </Link>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-semibold tracking-wide uppercase ${getStatusStyles(
                            o.status || "PENDING_PAYMENT",
                          )}`}
                        >
                          {getOrderStatusLabel(o.status || "PENDING_PAYMENT")}
                        </span>

                        <button
                          type="button"
                          onClick={async () => {
                            const newPaid = !o.isPaid;
                            try {
                              await onTogglePaid(o.id, newPaid);
                              toast.success(
                                newPaid
                                  ? "Markerad som betald"
                                  : "Betalning borttagen",
                              );
                            } catch {
                              toast.error(
                                "Kunde inte uppdatera betalningsstatus.",
                              );
                            }
                          }}
                          className={`px-2 py-0.5 rounded text-[9px] font-semibold tracking-wide uppercase transition-all ${
                            o.isPaid
                              ? "bg-blue-500/15 text-blue-800 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/25"
                              : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
                          }`}
                        >
                          {o.isPaid ? "Betald" : "Ej betald"}
                        </button>
                      </div>

                      <div className="text-[11px] text-muted-foreground">
                        <span>Sätt: </span>
                        <span className="font-medium text-foreground">
                          {getPayMethodTxt(o.payMethod, "sv")}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Kolumn 4: Åtgärder (Korrigerad kontrast) */}
                  <td className="py-4 px-4 align-top text-right">
                    <div className="flex flex-col gap-1 items-end ml-auto max-w-[130px]">
                      {["PENDING_PAYMENT"].includes(o.status || "") && (
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 w-full justify-start px-2 text-[11px] gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shadow-none font-normal"
                          disabled={approvingOrderId === o.id || isPending}
                          onClick={() => handleApprove(o.id)}
                        >
                          <CheckIcon className="h-3 w-3 shrink-0" />
                          {approvingOrderId === o.id ? "Beviljar…" : "Bevilja"}
                        </Button>
                      )}

                      {!o.isPaid && canMarkPaid && (
                        <form action={onMarkPaid} className="w-full">
                          <input type="hidden" name="orderId" value={o.id} />
                          <Button
                            type="submit"
                            size="sm"
                            className="h-7 w-full justify-start px-2 text-[11px] gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/20 shadow-none font-normal"
                          >
                            <DollarSignIcon className="h-3 w-3 shrink-0" />
                            Ange betald
                          </Button>
                        </form>
                      )}

                      <div className="w-full">
                        <EditOrderDialog
                          order={{
                            id: o.id,
                            userId: o.userId,
                            customerLabel,
                            orderItems: o.orderItems,
                          }}
                          userName={customerLabel}
                          products={products}
                          onSave={onUpdateOrder}
                          getParticipantsForUser={getParticipantsForUser}
                          createParticipant={createParticipant}
                          disabled={!canEditOrder}
                        />
                      </div>

                      {["PENDING_PAYMENT"].includes(o.status || "") && (
                        <CancelOrderBtn onCancel={onCancel} orderId={o.id} />
                      )}

                      <div className="w-full">
                        <DeleteOrderBtn orderId={o.id} onDelete={onDelete} />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <PaginationBar totalPages={totalPages} currentPage={currentPage} />

      {/* Confirmation Dialog */}
      <Dialog
        open={!!pendingApprovalOrder}
        onOpenChange={(open) => {
          if (!open) setPendingApprovalOrder(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <DialogTitle>Ofullständiga paketval</DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-xs">
              Följande paket har färre valda kurser än vad som ingår. Kunden
              förlorar de ej valda platserna om du beviljar.
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-xs">
            {pendingApprovalOrder?.orderItems
              ?.filter((oi) => {
                const maxCourses = oi.product?.maxCourses ?? 0;
                const currentCount = oi.courseSelections?.length ?? 0;
                return maxCourses > 0 && currentCount < maxCourses;
              })
              .map((oi) => {
                const count = oi.courseSelections?.length ?? 0;
                const maxCourses = oi.product?.maxCourses ?? 0;

                return (
                  <li
                    key={oi.id}
                    className="flex justify-between items-center gap-2 border-b border-border/40 last:border-0 pb-1.5 last:pb-0"
                  >
                    <span className="font-medium truncate">
                      {oi.product.name}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
                      {count} / {maxCourses} valda
                    </span>
                  </li>
                );
              })}
          </ul>

          <DialogFooter className="sm:justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPendingApprovalOrder(null)}
            >
              Avbryt
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={() => {
                if (pendingApprovalOrder) {
                  executeApprove(pendingApprovalOrder.id);
                }
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isPending ? "Beviljar..." : "Bevilja ändå"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
