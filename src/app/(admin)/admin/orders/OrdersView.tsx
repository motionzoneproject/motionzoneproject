"use client";

import { AlertTriangle, CheckIcon, DollarSignIcon, XIcon } from "lucide-react";
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
import type { Course } from "@/generated/prisma/client";
import { calculateAge, formatDateToInputStr } from "@/lib/date-utils";
import { formatPrice } from "@/lib/money";
import { getOrderStatusLabel, type OrderStatus } from "@/lib/order-status";
import { getCourseName, getPayMethodTxt } from "@/lib/tools";
import DeleteOrderBtn from "./components/DeleteOrderBtn";
import { OrderPackageDialog } from "./components/OrderPackageEditor";

type OrderLite = {
  id: string;
  userId: string;
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
        product: {
          name: string;
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
  defaultStatus,
  pageSize,
  onApprove,
  onMarkPaid,
  onCancel,
  onDelete,
  onSavePackage,
}: {
  orders: OrderLite[];
  defaultStatus: string;
  pageSize: number;
  onApprove: (formData: FormData) => void;
  onMarkPaid: (formData: FormData) => void;
  onCancel: (formData: FormData) => void;
  onDelete: (orderId: string) => boolean | Promise<boolean>;
  onSavePackage: (
    orderItemId: string,
    selectedCourseIds: string[],
  ) =>
    | Promise<{ success: boolean; msg?: string }>
    | { success: boolean; msg: string };
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const active = (sp.get("status")?.toUpperCase() || defaultStatus).toString();
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
      PAID: 0,
      CANCELLED: 0,
    };
    for (const o of orders) {
      const st = String(o.status || "PENDING_PAYMENT");
      if (st === "PENDING_PAYMENT") acc.PENDING += 1;
      else if (st === "APPROVED") acc.APPROVED += 1;
      else if (st === "PAID") acc.PAID += 1;
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
    { id: "PAID", label: "Betalda" },
    { id: "APPROVED", label: "Godkända" },
    { id: "CANCELLED", label: "Avbrutna" },
  ];

  const handleApprove = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);

    if (order) {
      // 1. Kontrollera om något paket helt saknar val (blockerande error)
      const hasUnselectedPackage = order.orderItems?.some((oi) => {
        const isPackage = (oi.product?.maxCourses ?? 0) > 0;
        const hasSelections = (oi.courseSelections?.length ?? 0) > 0;
        return isPackage && !hasSelections;
      });

      if (hasUnselectedPackage) {
        toast.error("Kan inte godkänna ordern: Minst ett paketval saknas.");
        return;
      }

      // 2. Kontrollera om något paket har färre valda kurser än maxCourses
      const hasLess = order.orderItems?.some((oi) => {
        const maxCourses = oi.product?.maxCourses ?? 0;
        const currentSelections = oi.courseSelections?.length ?? 0;
        return maxCourses > 0 && currentSelections < maxCourses;
      });

      if (hasLess) {
        // Öppna dialogen med denna order
        setPendingApprovalOrder(order);
        return;
      }
    }

    // Om allt är komplett, kör direkt
    executeApprove(orderId);
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

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-3 text-sm flex-wrap">
          <form action="/admin/orders" method="GET" className="contents">
            <input type="hidden" name="page" value="1" />
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
            <input type="hidden" name="page" value="1" />
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
              <th className="p-3 text-left font-medium">Paket</th>
              <th className="p-3 text-left font-medium">Total</th>
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-left font-medium">
                Betalningsalternativ
              </th>
              <th className="p-3 text-left font-medium">Detaljer</th>
              <th className="p-3 text-left font-medium min-w-[260px]">
                Åtgärder
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedOrders.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="p-6 text-center text-muted-foreground"
                >
                  Inga ordrar hittades för valt filter.
                </td>
              </tr>
            )}
            {paginatedOrders.map((o) => {
              const participants = Array.from(
                new Map(
                  (o.orderItems ?? []) // Ensure o.orderItems is an array
                    .map((oi) => oi.participant)
                    .filter((p): p is NonNullable<typeof p> => !!p)
                    .map((p) => [p.id, p]),
                ).values(),
              );

              return (
                <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span className="font-mono text-xs text-muted-foreground">
                        #{o.id.slice(0, 8)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDateToInputStr(new Date(o.createdAt))}
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
                          : (o.user?.email ?? o.userId)}{" "}
                        ({calculateAge(o.user?.details?.dateOfBirth)} år)
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
                          <div key={`${o.id}-p-${i}`}>
                            <span>
                              {p.name} ({calculateAge(p.dateOfBirth)} år)
                            </span>
                            <br />
                            <span className="text-xs text-muted-foreground">
                              {p.email}
                            </span>
                          </div>
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
                  <td className="p-3">
                    <div className="flex flex-col gap-1 max-w-[260px]">
                      {(o.orderItems ?? []).map((oi) => {
                        const courseOptions =
                          oi.product.courses?.map((c) => c.course) ?? [];
                        const selections =
                          oi.courseSelections?.flatMap((sel) =>
                            sel.course ? [getCourseName(sel.course)] : [],
                          ) ?? [];

                        if (
                          oi.product?.maxCourses == null ||
                          courseOptions.length === 0
                        ) {
                          return (
                            <span
                              key={`${oi.id}-empty`}
                              className="text-[11px] text-muted-foreground italic block"
                            >
                              {oi.product?.maxCourses != null
                                ? "Inga paketval tillgängliga"
                                : "—"}
                            </span>
                          );
                        }

                        const selectedIds =
                          oi.courseSelections?.flatMap((sel) =>
                            sel.course?.id ? [sel.course.id] : [],
                          ) ?? [];

                        const canEdit = o.status !== "APPROVED";

                        return (
                          <div
                            key={`${oi.id}-pack`}
                            className="flex flex-col gap-1.5 rounded-md border bg-muted/30 p-2"
                          >
                            {selections.length === 0 ? (
                              <span className="text-[11px] text-muted-foreground italic">
                                Inga paketval sparade
                              </span>
                            ) : (
                              selections.map((courseName, idx) => (
                                <span
                                  key={`${oi.id}-${courseName}-${idx}`}
                                  className="truncate text-[11px]"
                                >
                                  {courseName}
                                </span>
                              ))
                            )}

                            <OrderPackageDialog
                              orderItemId={oi.id ?? ""}
                              productName={oi.product?.name ?? "Produkt"}
                              maxCourses={oi.product?.maxCourses ?? 0}
                              courses={courseOptions}
                              selected={selectedIds}
                              onSave={async (orderItemId, next) => {
                                try {
                                  const res = await onSavePackage(
                                    orderItemId,
                                    next,
                                  );
                                  if (res?.success) {
                                    toast.success("Paketvalen har sparats!");
                                  } else {
                                    toast.error(
                                      res?.msg ||
                                        "Kunde inte spara paketvalen.",
                                    );
                                  }
                                } catch (err) {
                                  const msg =
                                    (err as { message?: string })?.message ||
                                    "Ett fel uppstod när paketvalen skulle sparas.";
                                  toast.error(msg);
                                }
                              }}
                              disabled={!canEdit}
                              readOnlyMessage="Paketvalet går inte att ändra när ordern är godkänd."
                              triggerLabel="Ändra paket"
                            />
                          </div>
                        );
                      })}
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
                      {getOrderStatusLabel(o.status || "PENDING_PAYMENT")}
                    </span>
                  </td>
                  <td className="p-3">{getPayMethodTxt(o.payMethod, "sv")}</td>
                  <td className="p-3">
                    <Link
                      href={createOrderDetailHref(o.id)}
                      className="text-blue-500 hover:underline font-medium"
                    >
                      Visa
                    </Link>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        {/* Bekräftelsedialog för paket med ofullständigt (men giltigt) kursval */}

                        {/* Bekräftelsedialog för paket med ofullständigt kursval */}
                        <Dialog
                          open={!!pendingApprovalOrder}
                          onOpenChange={(open) => {
                            if (!open) setPendingApprovalOrder(null);
                          }}
                        >
                          <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-md">
                            <DialogHeader>
                              <div className="flex items-center gap-2 text-amber-600">
                                <AlertTriangle className="h-5 w-5 shrink-0" />
                                <DialogTitle>
                                  Ofullständiga paketval
                                </DialogTitle>
                              </div>
                              <DialogDescription className="pt-2">
                                Följande paket har färre valda kurser än vad som
                                ingår. Kunden förlorar de ej valda platserna om
                                du godkänner.
                              </DialogDescription>
                            </DialogHeader>

                            <ul className="space-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
                              {pendingApprovalOrder?.orderItems
                                ?.filter((oi) => {
                                  const maxCourses =
                                    oi.product?.maxCourses ?? 0;
                                  const currentCount =
                                    oi.courseSelections?.length ?? 0;
                                  return (
                                    maxCourses > 0 && currentCount < maxCourses
                                  );
                                })
                                .map((oi) => {
                                  const count =
                                    oi.courseSelections?.length ?? 0;
                                  const maxCourses =
                                    oi.product?.maxCourses ?? 0;

                                  return (
                                    <li
                                      key={oi.id}
                                      className="flex justify-between items-center gap-2 border-b last:border-0 pb-1.5 last:pb-0"
                                    >
                                      <span className="font-medium truncate">
                                        {oi.product.name}
                                      </span>
                                      <span className="text-muted-foreground shrink-0 text-xs bg-muted px-2 py-0.5 rounded font-mono">
                                        {count} / {maxCourses} kurser valda
                                      </span>
                                    </li>
                                  );
                                })}
                            </ul>

                            {/*"here"*/}

                            <DialogFooter className="sm:justify-between gap-2 pt-2">
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setPendingApprovalOrder(null)}
                              >
                                Avbryt
                              </Button>
                              <Button
                                type="button"
                                disabled={isPending}
                                onClick={() => {
                                  if (pendingApprovalOrder) {
                                    executeApprove(pendingApprovalOrder.id);
                                  }
                                }}
                                className="bg-amber-600 hover:bg-amber-700 text-white"
                              >
                                {isPending ? "Godkänner..." : "Godkänn ändå"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        {active !== "PENDING" &&
                          ["PAID"].includes(o.status || "") && (
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 px-2.5 text-xs gap-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400 shadow-none"
                              disabled={approvingOrderId === o.id || isPending}
                              onClick={() => handleApprove(o.id)}
                            >
                              <CheckIcon className="h-3.5 w-3.5" />
                              {approvingOrderId === o.id
                                ? "Godkänner…"
                                : "Godkänn"}
                            </Button>
                          )}

                        {active !== "APPROVED" &&
                          ["PENDING_PAYMENT"].includes(o.status || "") && (
                            <form action={onMarkPaid}>
                              <input
                                type="hidden"
                                name="orderId"
                                value={o.id}
                              />
                              <Button
                                type="submit"
                                size="sm"
                                className="h-7 px-2.5 text-xs gap-1 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400 shadow-none"
                              >
                                <DollarSignIcon className="h-3.5 w-3.5" />
                                Betald
                              </Button>
                            </form>
                          )}

                        {["PENDING_PAYMENT"].includes(o.status || "") && (
                          <form action={onCancel}>
                            <input type="hidden" name="orderId" value={o.id} />
                            <Button
                              type="submit"
                              size="sm"
                              className="h-7 px-2.5 text-xs gap-1 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400 shadow-none"
                            >
                              <XIcon className="h-3.5 w-3.5" />
                              Avbryt
                            </Button>
                          </form>
                        )}
                      </div>

                      <div className="w-px h-5 bg-border" />

                      <DeleteOrderBtn orderId={o.id} onDelete={onDelete} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalFiltered > 0 && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <span className="text-sm text-muted-foreground">
            Visar {pageStart + 1}–{Math.min(pageEnd, totalFiltered)} av{" "}
            {totalFiltered}
          </span>
          <PaginationBar currentPage={currentPage} totalPages={totalPages} />
        </div>
      )}
    </>
  );
}
