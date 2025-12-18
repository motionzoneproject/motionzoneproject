"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { adminGetOrder } from "@/lib/actions/orders";

type OrderStatus =
  | "CREATED"
  | "PENDING_PAYMENT"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "PAID";

type OrderItemLite = {
  id: string;
  price: unknown;
  count: number;
  productId: string;
  product?: { name?: string | null } | null;
};

type StatusEventLite = {
  id: string;
  fromStatus?: OrderStatus | null;
  toStatus: OrderStatus;
  note?: string | null;
  createdAt: string | Date;
  changedByUserId: string;
  changedBy?: { email?: string | null } | null;
};

type OrderDetail = {
  id: string;
  userId: string;
  user?: { email?: string | null } | null;
  totalPrice: unknown;
  createdAt: string | Date;
  postalcode?: string | null;
  status?: OrderStatus;
  orderItems?: OrderItemLite[];
  statusEvents?: StatusEventLite[];
};

export default function OrderDetailsClient() {
  const sp = useSearchParams();
  const status = (sp.get("status") || "PENDING_PAYMENT").toUpperCase();
  const orderId = sp.get("orderId")?.trim() || "";

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [_isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!orderId) return;
    startTransition(async () => {
      try {
        const data = await adminGetOrder(orderId);
        setOrder(data);
        setError(null);
      } catch (e) {
        const msg =
          (e as { message?: string })?.message || "Kunde inte hämta order.";
        setError(msg);
      }
    });
  }, [orderId]);

  if (!orderId) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Orderdetaljer</h1>
          <Link href={`/admin/orders?status=${status}`} className="underline">
            Tillbaka
          </Link>
        </div>
        <p className="text-sm text-gray-700">Saknar orderId i URL:en.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Orderdetaljer</h1>
          <Link href={`/admin/orders?status=${status}`} className="underline">
            Tillbaka
          </Link>
        </div>
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Orderdetaljer</h1>
          <Link href={`/admin/orders?status=${status}`} className="underline">
            Tillbaka
          </Link>
        </div>
        <p className="text-sm text-gray-700">Hämtar order…</p>
      </div>
    );
  }

  const total = Number(order?.totalPrice ?? 0);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orderdetaljer</h1>
        <Link href={`/admin/orders?status=${status}`} className="underline">
          Tillbaka
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="space-y-1">
          <div>
            <span className="text-gray-600">Ordernummer:</span>{" "}
            <span className="font-mono">{order.id}</span>
          </div>
          <div>
            <span className="text-gray-600">Kund:</span>{" "}
            {order.user?.email ?? order.userId}
          </div>
          <div>
            <span className="text-gray-600">Status:</span>{" "}
            <span className="font-semibold">
              {order.status ?? "PENDING_PAYMENT"}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Skapad:</span>{" "}
            {new Date(order.createdAt).toLocaleString()}
          </div>
        </div>
        <div className="space-y-1">
          <div className="font-semibold">Totalt: {total.toFixed(2)} SEK</div>
          {order.postalcode && (
            <div>
              <span className="text-gray-600">Postnummer:</span>{" "}
              {order.postalcode}
            </div>
          )}
        </div>
      </div>

      <div className="border rounded">
        <div className="grid grid-cols-4 gap-2 p-2 text-xs text-gray-600">
          <span>Produkt</span>
          <span className="text-right">Pris/st</span>
          <span className="text-right">Antal</span>
          <span className="text-right">Summa</span>
        </div>
        {(order.orderItems || []).map((it) => {
          const unit = Number(it.price ?? 0);
          const sum = unit * (it.count ?? 0);
          return (
            <div
              key={it.id}
              className="grid grid-cols-4 gap-2 p-2 border-t text-sm"
            >
              <span>{it.product?.name ?? it.productId}</span>
              <span className="text-right">{unit.toFixed(2)} SEK</span>
              <span className="text-right">{it.count}</span>
              <span className="text-right font-medium">
                {sum.toFixed(2)} SEK
              </span>
            </div>
          );
        })}
        <div className="grid grid-cols-4 gap-2 p-2 border-t font-semibold">
          <span className="col-span-3 text-right">Totalt</span>
          <span className="text-right">{total.toFixed(2)} SEK</span>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Statushistorik</h2>
        <div className="border rounded divide-y">
          {(order.statusEvents || []).length === 0 && (
            <div className="p-2 text-sm text-gray-600">
              Inga statusändringar ännu.
            </div>
          )}
          {(order.statusEvents || []).map((ev) => (
            <div
              key={ev.id}
              className="p-2 text-sm flex items-center justify-between"
            >
              <div>
                <div className="font-medium">
                  {ev.fromStatus ?? "—"} → {ev.toStatus}
                </div>
                {ev.note && <div className="text-gray-600">{ev.note}</div>}
              </div>
              <div className="text-right text-gray-600">
                <div>{new Date(ev.createdAt).toLocaleString()}</div>
                <div>{ev.changedBy?.email ?? ev.changedByUserId}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
