import type { Metadata } from "next";
import { pick } from "@/lib/i18n/pick";
import { formatPrice } from "@/lib/money";
import { getOrderById } from "@/lib/orders";
import { getDictionary } from "@/locales/get-dictionary";

export const metadata: Metadata = {
  title: "Tack för din beställning",
  robots: { index: false, follow: false },
};

function getStatusLabel(
  status: string,
  t: Awaited<ReturnType<typeof getDictionary>>["t"],
) {
  switch (status) {
    case "PENDING_PAYMENT":
      return t.checkout.success.statusPendingPayment;
    case "APPROVED":
      return t.checkout.success.statusApproved;
    case "PAID":
      return t.checkout.success.statusPaid;
    case "CANCELLED":
      return t.checkout.success.statusCancelled;
    default:
      return status;
  }
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { lang, t } = await getDictionary();
  const dateLocale = lang === "en" ? "en-GB" : "sv-SE";
  const { orderId: rawOrderId } = await searchParams;
  const orderId = typeof rawOrderId === "string" ? rawOrderId : undefined;

  const order = orderId ? await getOrderById(orderId) : null;

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">{t.checkout.success.title}</h1>
      {order ? (
        <div className="space-y-3">
          <p>
            {t.checkout.success.thanks.replace(
              "{{name}}",
              order.user?.name ??
                order.user?.email ??
                t.checkout.success.thanksFallbackCustomer,
            )}
          </p>
          <div className="text-sm">
            <div>
              <span className="text-gray-600">
                {t.checkout.success.orderNumber}
              </span>
              <span className="ml-2 font-mono">{order.id}</span>
            </div>
            <div>
              <span className="text-gray-600">{t.checkout.success.status}</span>
              <span className="ml-2 font-semibold">
                {getStatusLabel(order.status ?? "PENDING_PAYMENT", t)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">{t.checkout.success.date}</span>
              <span className="ml-2">
                {new Date(order.createdAt).toLocaleString(dateLocale)}
              </span>
            </div>
          </div>

          <div className="border rounded">
            <div className="grid grid-cols-4 gap-2 p-2 text-xs text-gray-600">
              <span>{t.checkout.success.colProduct}</span>
              <span className="text-right">
                {t.checkout.success.colUnitPrice}
              </span>
              <span className="text-right">{t.checkout.success.colCount}</span>
              <span className="text-right">{t.checkout.success.colSum}</span>
            </div>
            {order.orderItems.map((it) => {
              const unit = it.price;
              const sum = unit * it.count;
              const productName = it.product
                ? (pick(it.product, "name", lang) as string)
                : it.productId;
              return (
                <div
                  key={it.id}
                  className="grid grid-cols-4 gap-2 p-2 border-t text-sm"
                >
                  <span>
                    {productName}
                    <span className="block text-xs text-gray-500">
                      {it.participant?.name
                        ? t.checkout.success.participantLabel.replace(
                            "{{name}}",
                            it.participant.name,
                          )
                        : t.checkout.success.participantLabel.replace(
                            "{{name}}",
                            t.checkout.success.participantSelf,
                          )}
                    </span>
                  </span>
                  <span className="text-right">{formatPrice(unit, lang)}</span>
                  <span className="text-right">{it.count}</span>
                  <span className="text-right font-medium">
                    {formatPrice(sum, lang)}
                  </span>
                </div>
              );
            })}
            <div className="grid grid-cols-4 gap-2 p-2 border-t font-semibold">
              <span className="col-span-3 text-right">
                {t.checkout.success.total}
              </span>
              <span className="text-right">
                {formatPrice(order.totalPrice, lang)}
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-600">
            {t.checkout.success.paymentNote}
          </p>

          <a href="/" className="underline">
            {t.checkout.success.toHome}
          </a>
        </div>
      ) : (
        <div>
          <p>{t.checkout.success.received}</p>
          <a href="/" className="underline">
            {t.checkout.success.toHome}
          </a>
        </div>
      )}
    </div>
  );
}
