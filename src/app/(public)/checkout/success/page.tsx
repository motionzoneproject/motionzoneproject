import { CheckCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="bg-background">
      <section className="border-b border-border py-8 text-center">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-center mb-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-brand/10 border border-brand/20">
              <CheckCircle className="w-7 h-7 text-brand" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-light text-foreground leading-[1.1] tracking-tight mb-2 animate-fade-in-left [animation-delay:200ms]">
            {t.checkout.success.title}
          </h1>
          {order && (
            <p className="text-muted-foreground">
              {t.checkout.success.thanks.replace(
                "{{name}}",
                order.user?.name ??
                  order.user?.email ??
                  t.checkout.success.thanksFallbackCustomer,
              )}
            </p>
          )}
        </div>
      </section>

      <section className="py-8">
        <div className="max-w-xl mx-auto px-4 space-y-6">
          {order ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{t.checkout.success.orderNumber}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t.checkout.success.orderNumber}
                    </span>
                    <span className="font-mono text-foreground">
                      {order.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t.checkout.success.status}
                    </span>
                    <span className="font-semibold text-foreground">
                      {getStatusLabel(order.status ?? "PENDING_PAYMENT", t)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t.checkout.success.date}
                    </span>
                    <span className="text-foreground">
                      {new Date(order.createdAt).toLocaleString(dateLocale)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t.checkout.yourProducts}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-4 gap-2 px-6 py-3 text-xs text-muted-foreground border-b border-border">
                    <span>{t.checkout.success.colProduct}</span>
                    <span className="text-right">
                      {t.checkout.success.colUnitPrice}
                    </span>
                    <span className="text-right">
                      {t.checkout.success.colCount}
                    </span>
                    <span className="text-right">
                      {t.checkout.success.colSum}
                    </span>
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
                        className="grid grid-cols-4 gap-2 px-6 py-3 border-b border-border text-sm"
                      >
                        <span>
                          {productName}
                          <span className="block text-xs text-muted-foreground">
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
                        <span className="text-right text-muted-foreground">
                          {formatPrice(unit, lang)}
                        </span>
                        <span className="text-right text-muted-foreground">
                          {it.count}
                        </span>
                        <span className="text-right font-medium text-foreground">
                          {formatPrice(sum, lang)}
                        </span>
                      </div>
                    );
                  })}
                  <div className="grid grid-cols-4 gap-2 px-6 py-3 font-semibold text-foreground">
                    <span className="col-span-3 text-right">
                      {t.checkout.success.total}
                    </span>
                    <span className="text-right">
                      {formatPrice(order.totalPrice, lang)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground text-center">
                {t.checkout.success.paymentNote}
              </p>

              <Button
                asChild
                className="w-full bg-brand hover:bg-brand-light text-white"
              >
                <Link href="/">{t.checkout.success.toHome}</Link>
              </Button>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center space-y-4">
                <p className="text-muted-foreground">
                  {t.checkout.success.received}
                </p>
                <Button
                  asChild
                  className="bg-brand hover:bg-brand-light text-white"
                >
                  <Link href="/">{t.checkout.success.toHome}</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
