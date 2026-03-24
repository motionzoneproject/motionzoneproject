import { formatPrice } from "@/lib/money";
import { getOrderById } from "@/lib/orders";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { orderId: rawOrderId } = await searchParams;
  const orderId = typeof rawOrderId === "string" ? rawOrderId : undefined;

  const order = orderId ? await getOrderById(orderId) : null;

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Orderbekräftelse</h1>
      {order ? (
        <div className="space-y-3">
          <p>
            Tack för din beställning,{" "}
            {order.user?.name ?? order.user?.email ?? "kund"}.
          </p>
          <div className="text-sm">
            <div>
              <span className="text-gray-600">Ordernummer:</span>
              <span className="ml-2 font-mono">{order.id}</span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <span className="ml-2 font-semibold">
                {order.status ?? "PENDING_PAYMENT"}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Datum:</span>
              <span className="ml-2">
                {new Date(order.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="border rounded">
            <div className="grid grid-cols-4 gap-2 p-2 text-xs text-gray-600">
              <span>Produkt</span>
              <span className="text-right">Pris/st</span>
              <span className="text-right">Antal</span>
              <span className="text-right">Summa</span>
            </div>
            {order.orderItems.map((it) => {
              const unit = it.price;
              const sum = unit * it.count;
              return (
                <div
                  key={it.id}
                  className="grid grid-cols-4 gap-2 p-2 border-t text-sm"
                >
                  <span>
                    {it.product?.name ?? it.productId}
                    <span className="block text-xs text-gray-500">
                      Deltagare: {it.participant?.name ?? "Du själv"}
                    </span>
                  </span>
                  <span className="text-right">{formatPrice(unit)}</span>
                  <span className="text-right">{it.count}</span>
                  <span className="text-right font-medium">
                    {formatPrice(sum)}
                  </span>
                </div>
              );
            })}
            <div className="grid grid-cols-4 gap-2 p-2 border-t font-semibold">
              <span className="col-span-3 text-right">Totalt</span>
              <span className="text-right">
                {formatPrice(order.totalPrice)}
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-600">
            Betalning via faktura/överenskommelse. En lärare kommer att godkänna
            din order när betalning bekräftats.
          </p>

          <a href="/" className="underline">
            Till startsidan
          </a>
        </div>
      ) : (
        <div>
          <p>Beställning mottagen.</p>
          <a href="/" className="underline">
            Till startsidan
          </a>
        </div>
      )}
    </div>
  );
}
