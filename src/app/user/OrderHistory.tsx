"use client";

import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type OrderItem = {
  id: string;
  price: number | string | unknown;
  count: number;
  product: {
    name: string;
  };
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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-green-500">Betald</Badge>;
      case "PENDING_PAYMENT":
        return <Badge variant="outline">Väntar på betalning</Badge>;
      case "APPROVED":
        return <Badge className="bg-blue-500">Godkänd</Badge>;
      case "CREATED":
        return <Badge variant="secondary">Skapad</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="mt-8 space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">
        Orderhistorik
      </h3>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="p-3 text-left font-medium">Order ID</th>
              <th className="p-3 text-left font-medium">Datum</th>
              <th className="p-3 text-left font-medium">Summa</th>
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-right font-medium">Åtgärd</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  Inga beställningar hittades.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-b last:border-0">
                  <td className="p-3 font-mono text-xs">
                    {order.id.slice(0, 8)}...
                  </td>
                  <td className="p-3">
                    {format(new Date(order.createdAt), "d MMM yyyy", {
                      locale: sv,
                    })}
                  </td>
                  <td className="p-3">{order.totalPrice?.toString()} kr</td>
                  <td className="p-3">{getStatusBadge(order.status)}</td>
                  <td className="p-3 text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          Visa detaljer
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Orderdetaljer</DialogTitle>
                        </DialogHeader>
                        {selectedOrder && (
                          <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Order ID:
                              </span>
                              <span className="font-mono">
                                {selectedOrder.id}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Datum:
                              </span>
                              <span>
                                {format(
                                  new Date(selectedOrder.createdAt),
                                  "PPP p",
                                  {
                                    locale: sv,
                                  }
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Status:
                              </span>
                              {getStatusBadge(selectedOrder.status)}
                            </div>

                            <div className="border-t pt-4">
                              <h4 className="font-medium mb-2">Produkter</h4>
                              <div className="space-y-2">
                                {selectedOrder.orderItems.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex justify-between text-sm"
                                  >
                                    <span>
                                      {item.product.name} x {item.count}
                                    </span>
                                    <span>{item.price?.toString()} kr</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="border-t pt-4 flex justify-between font-bold">
                              <span>Totalt</span>
                              <span>
                                {selectedOrder.totalPrice?.toString()} kr
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
