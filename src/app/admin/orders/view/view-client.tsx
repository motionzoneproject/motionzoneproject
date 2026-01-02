"use client";

import Image from "next/image";
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
  user?: {
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phoneNumber?: string | null;
    address?: string | null;
    postalCode?: string | null;
    city?: string | null;
    dateOfBirth?: string | Date | null;
    bio?: string | null;
    role?: string | null;
    image?: string | null;
    banned?: boolean | null;
    banReason?: string | null;
    createdAt?: string | Date | null;
  } | null;
  totalPrice: unknown;
  createdAt: string | Date;
  updatedAt: string | Date;
  postalcode?: string | null;
  status?: OrderStatus;
  orderItems?: OrderItemLite[];
  statusEvents?: StatusEventLite[];
};

function calculateAge(dob: string | Date | null | undefined) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

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
          <Link
            href={`/admin/orders?status=${status}`}
            className="underline text-blue-500 hover:text-blue-600"
          >
            Tillbaka
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Saknar orderId i URL:en.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Orderdetaljer</h1>
          <Link
            href={`/admin/orders?status=${status}`}
            className="underline text-blue-500 hover:text-blue-600"
          >
            Tillbaka
          </Link>
        </div>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Orderdetaljer</h1>
          <Link
            href={`/admin/orders?status=${status}`}
            className="underline text-blue-500 hover:text-blue-600"
          >
            Tillbaka
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">Hämtar order…</p>
      </div>
    );
  }

  const total = Number(order?.totalPrice ?? 0);

  return (
    <div className="p-4 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.id.slice(0, 8)}</h1>
          <p className="text-sm text-muted-foreground">
            Hanterar detaljer för order och kundprofil
          </p>
        </div>
        <Link
          href={`/admin/orders?status=${status}`}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Tillbaka till listan
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Summary Card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card border rounded-lg p-4 shadow-sm space-y-3">
            <h2 className="font-semibold border-b pb-2">Ordersammanfattning</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-bold px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded text-xs uppercase">
                  {order.status ?? "PENDING_PAYMENT"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Totalbelopp:</span>
                <span className="font-bold text-lg">
                  {total.toFixed(2)} SEK
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Skapad:</span>
                <span>{new Date(order.createdAt).toLocaleString("sv-SE")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Uppdaterad:</span>
                <span>{new Date(order.updatedAt).toLocaleString("sv-SE")}</span>
              </div>
              <div className="pt-2 border-t">
                <span className="text-muted-foreground block mb-1">
                  Order ID:
                </span>
                <code className="text-[10px] bg-muted p-1 rounded block break-all">
                  {order.id}
                </code>
              </div>
            </div>
          </div>

          {/* System Info / Flags */}
          <div className="bg-muted/30 border rounded-lg p-4 space-y-3">
            <h2 className="font-semibold text-sm text-foreground/80">
              Systemflaggor
            </h2>
            <div className="space-y-2 text-xs">
              {order.postalcode && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Checkout Postnr:
                  </span>
                  <span>{order.postalcode}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Användar ID:</span>
                <span className="font-mono">{order.userId.slice(0, 8)}...</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Profile Card */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                {order.user?.image && (
                  <div className="relative w-12 h-12">
                    <Image
                      src={order.user.image}
                      alt="Profilbild"
                      fill
                      className="rounded-full border object-cover"
                    />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold">Kundprofil</h2>
                  <p className="text-xs text-muted-foreground">
                    ID: {order.userId}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {order.user?.role && (
                  <span className="px-2 py-1 bg-purple-500/10 text-purple-500 rounded text-[10px] font-bold uppercase">
                    {order.user.role}
                  </span>
                )}
                {order.user?.banned && (
                  <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded text-[10px] font-bold uppercase">
                    Avstängd
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <section>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Personuppgifter
                  </h3>
                  <div className="space-y-1">
                    <p className="text-base font-medium">
                      {order.user?.firstName} {order.user?.lastName}
                    </p>
                    <p className="text-muted-foreground">{order.user?.email}</p>
                    {order.user?.phoneNumber && (
                      <p className="text-muted-foreground">
                        {order.user.phoneNumber}
                      </p>
                    )}
                    {order.user?.dateOfBirth && (
                      <p className="text-muted-foreground">
                        {new Date(order.user.dateOfBirth).toLocaleDateString(
                          "sv-SE"
                        )}{" "}
                        <span className="text-muted-foreground/60 ml-1">
                          ({calculateAge(order.user.dateOfBirth)} år)
                        </span>
                      </p>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Adress
                  </h3>
                  <div className="text-muted-foreground">
                    {order.user?.address ? (
                      <>
                        <p>{order.user.address}</p>
                        <p>
                          {order.user.postalCode} {order.user.city}
                        </p>
                      </>
                    ) : (
                      <p className="italic text-muted-foreground/60">
                        Ingen adress angiven
                      </p>
                    )}
                  </div>
                </section>
              </div>

              <div className="space-y-4">
                <section>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Om kunden
                  </h3>
                  <div className="bg-muted/30 p-3 rounded border text-foreground min-h-[60px]">
                    {order.user?.bio || (
                      <p className="italic text-muted-foreground/60">
                        Ingen bio tillgänglig
                      </p>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Kontostatus
                  </h3>
                  <div className="space-y-1 text-xs">
                    <p>
                      <span className="text-muted-foreground">
                        Medlem sedan:
                      </span>{" "}
                      {order.user?.createdAt
                        ? new Date(order.user.createdAt).toLocaleDateString(
                            "sv-SE"
                          )
                        : "Okänt"}
                    </p>
                    {order.user?.banned && (
                      <p className="text-destructive font-medium">
                        Anledning: {order.user.banReason || "Ej angiven"}
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Items Table */}
      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b">
          <h2 className="font-semibold">Beställda produkter</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b bg-muted/20">
              <th className="px-4 py-2 font-medium">Produkt</th>
              <th className="px-4 py-2 font-medium text-right">Pris/st</th>
              <th className="px-4 py-2 font-medium text-right">Antal</th>
              <th className="px-4 py-2 font-medium text-right">Summa</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(order.orderItems || []).map((it) => {
              const unit = Number(it.price ?? 0);
              const sum = unit * (it.count ?? 0);
              return (
                <tr key={it.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    {it.product?.name ?? it.productId}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {unit.toFixed(2)} SEK
                  </td>
                  <td className="px-4 py-3 text-right">{it.count}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {sum.toFixed(2)} SEK
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/50 font-bold">
              <td colSpan={3} className="px-4 py-3 text-right">
                Totalt att betala
              </td>
              <td className="px-4 py-3 text-right text-lg">
                {total.toFixed(2)} SEK
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Status History */}
      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b">
          <h2 className="font-semibold">Statushistorik & Logg</h2>
        </div>
        <div className="divide-y">
          {(order.statusEvents || []).length === 0 && (
            <div className="p-4 text-sm text-muted-foreground italic">
              Inga statusändringar har loggats för denna order.
            </div>
          )}
          {(order.statusEvents || []).map((ev) => (
            <div
              key={ev.id}
              className="p-4 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/30"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">
                    {ev.fromStatus ?? "START"}
                  </span>
                  <span className="text-muted-foreground/40">→</span>
                  <span className="font-bold text-blue-500">{ev.toStatus}</span>
                </div>
                {ev.note && (
                  <div className="text-foreground bg-blue-500/10 p-2 rounded border border-blue-500/20 text-xs">
                    {ev.note}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="font-medium">
                  {new Date(ev.createdAt).toLocaleString("sv-SE")}
                </div>
                <div className="text-xs text-muted-foreground">
                  Ändrad av: {ev.changedBy?.email ?? ev.changedByUserId}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
