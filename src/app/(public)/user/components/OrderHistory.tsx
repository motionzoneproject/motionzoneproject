"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Course } from "@/generated/prisma/client";
import {
  formatDateToInputStr,
  formatLongFriendlyDateTime,
} from "@/lib/date-utils";
import { formatPrice } from "@/lib/money";
import { getOrderStatusLabel } from "@/lib/order-status";
import { getCourseName } from "@/lib/tools";
import type { AppLang } from "@/locales/config-lang";
import { normalizeLang } from "@/locales/config-lang";

type OrderItem = {
  id: string;
  price: number | string | unknown;
  count: number;
  courseSelections?: { course: Course }[] | null;
  product: {
    name: string;
    maxCourses: number | null;
  };
  participant?: {
    name: string;
  } | null;
};

type Order = {
  id: string;
  totalPrice: number | string | unknown;
  status: string;
  createdAt: Date;
  orderItems: OrderItem[];
};

interface OrderHistoryProps {
  orders: Order[];
}

export default function OrderHistory({ orders }: OrderHistoryProps) {
  const { t, i18n } = useTranslation();
  const lang: AppLang = normalizeLang(i18n.language);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const statusLabels = {
    AWAITING_APPROVAL: t("user.orderHistory.statusPendingPayment"),
    APPROVED: t("user.orderHistory.statusApproved"),
    CANCELLED: t("user.orderHistory.statusCancelled"),
  } as const;

  const getStatusBadge = (status: string) => {
    const label = getOrderStatusLabel(status, statusLabels);

    switch (status) {
      case "AWAITING_APPROVAL":
        return <Badge variant="outline">{label}</Badge>;
      case "APPROVED":
        return <Badge className="bg-blue-500">{label}</Badge>;
      default:
        return <Badge variant="outline">{label}</Badge>;
    }
  };

  return (
    <div className="mt-8 space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">
        {t("user.orderHistory.title")}
      </h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-[640px] w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="p-3 text-left font-medium">
                {t("user.orderHistory.colOrderId")}
              </th>
              <th className="p-3 text-left font-medium">
                {t("user.orderHistory.colDate")}
              </th>
              <th className="p-3 text-left font-medium">
                {t("user.orderHistory.colTotal")}
              </th>
              <th className="p-3 text-left font-medium">
                {t("user.orderHistory.colStatus")}
              </th>
              <th className="p-3 text-right font-medium">
                {t("user.orderHistory.colAction")}
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  {t("user.orderHistory.empty")}
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-b last:border-0">
                  <td className="p-3 font-mono text-xs">
                    {order.id.slice(0, 8)}...
                  </td>
                  <td className="p-3">
                    {formatDateToInputStr(new Date(order.createdAt))}
                  </td>
                  <td className="p-3">
                    {order.totalPrice != null
                      ? formatPrice(Number(order.totalPrice), lang)
                      : "-"}
                  </td>
                  <td className="p-3">{getStatusBadge(order.status)}</td>
                  <td className="p-3 text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          onClick={() => setSelectedOrder(order)}
                        >
                          {t("user.orderHistory.viewDetails")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[90dvh] overflow-auto max-w-md">
                        <DialogHeader>
                          <DialogTitle>
                            {t("user.orderHistory.detailsTitle")}
                          </DialogTitle>
                        </DialogHeader>
                        {selectedOrder && (
                          <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {t("user.orderHistory.orderIdLabel")}
                              </span>
                              <span className="font-mono">
                                {selectedOrder.id}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {t("user.orderHistory.dateLabel")}
                              </span>
                              <span>
                                {formatLongFriendlyDateTime(
                                  new Date(selectedOrder.createdAt),
                                  lang,
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {t("user.orderHistory.statusLabel")}
                              </span>
                              {getStatusBadge(selectedOrder.status)}
                            </div>

                            <div className="border-t pt-4">
                              <h4 className="font-medium mb-2">
                                {t("user.orderHistory.products")}
                              </h4>
                              <div className="space-y-3">
                                {selectedOrder.orderItems.map((item) => {
                                  const isPackage =
                                    item.product.maxCourses != null &&
                                    item.product.maxCourses > 0;

                                  const selections =
                                    item.courseSelections ?? [];

                                  return (
                                    <div
                                      key={item.id}
                                      className="text-sm space-y-1 bg-muted/30 p-2.5 rounded-md border"
                                    >
                                      <div className="flex justify-between items-start gap-3">
                                        <div>
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-medium">
                                              {item.product.name} x {item.count}
                                            </span>
                                            {isPackage && (
                                              <Badge
                                                variant="secondary"
                                                className="text-[10px] h-4 px-1.5 font-normal"
                                              >
                                                Paketval: ({selections.length}/
                                                {item.product.maxCourses}) valda
                                              </Badge>
                                            )}
                                          </div>
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            {t(
                                              "user.orderHistory.participantPrefix",
                                            )}{" "}
                                            {item.participant?.name ??
                                              t(
                                                "user.orderHistory.participantSelf",
                                              )}
                                          </p>
                                        </div>
                                        <span className="font-medium whitespace-nowrap">
                                          {item.price != null
                                            ? formatPrice(
                                                Number(item.price),
                                                lang,
                                              )
                                            : "-"}
                                        </span>
                                      </div>

                                      {/* Paketval / Kurser */}
                                      {isPackage && (
                                        <div className="mt-2 pt-2 border-t border-dashed text-xs text-muted-foreground">
                                          <span className="font-semibold block text-[11px] uppercase tracking-wider text-muted-foreground/80 mb-1">
                                            Valda kurser:
                                          </span>
                                          {selections.length > 0 ? (
                                            <ul className="list-disc list-inside space-y-0.5 pl-0.5">
                                              {selections.map((sel, idx) => (
                                                <li
                                                  key={sel.course.id ?? idx}
                                                  className="text-foreground/90"
                                                >
                                                  {getCourseName(
                                                    sel.course,
                                                    lang,
                                                  )}
                                                </li>
                                              ))}
                                            </ul>
                                          ) : (
                                            <span className="italic text-muted-foreground/70">
                                              Inga kurser valda än
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="border-t pt-4 flex justify-between font-bold">
                              <span>{t("user.orderHistory.total")}</span>
                              <span>
                                {selectedOrder.totalPrice != null
                                  ? formatPrice(
                                      Number(selectedOrder.totalPrice),
                                      lang,
                                    )
                                  : "-"}
                              </span>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
