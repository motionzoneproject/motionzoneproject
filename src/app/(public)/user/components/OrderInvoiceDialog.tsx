"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { setOwnOrdersInvoiceRecipient } from "@/lib/actions/invoice-actions";
import { formatDateToInputStr } from "@/lib/date-utils";
import { isMinor } from "@/lib/invoice-recipient";
import { formatPrice } from "@/lib/money";
import type { AppLang } from "@/locales/config-lang";
import { normalizeLang } from "@/locales/config-lang";
import { InvoiceRecipientSchema } from "@/validations/userforms";

const formSchema = InvoiceRecipientSchema;
type FormValues = z.infer<typeof formSchema>;

export type InvoiceOrder = {
  id: string;
  createdAt: Date | string;
  totalPrice: number | string | unknown;
  invoiceName?: string | null;
  invoiceEmail?: string | null;
  invoicePhone?: string | null;
};

/**
 * Fakturamottagaren på en eller flera av kundens egna ordrar.
 *
 * Uppgiften sitter på ordern, så den fylls i därifrån. Flera ordrar åt gången
 * finns för att samma person betalar för hela familjen — banderollen högst upp
 * skickar in alla som saknar uppgiften på en gång.
 */
export function OrderInvoiceDialog({
  orders,
  accountName,
  accountEmail,
  dateOfBirth,
  savedInvoice,
  trigger,
}: {
  orders: InvoiceOrder[];
  accountName: string;
  accountEmail: string;
  dateOfBirth: Date | null;
  savedInvoice: {
    invoiceName: string | null;
    invoiceEmail: string | null;
    invoicePhone: string | null;
  };
  trigger: ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const lang: AppLang = normalizeLang(i18n.language);
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // Kontot kan tillhöra ett barn, och då är kontonamnet fel svar. Förifyll
  // hellre ingenting än det.
  const accountIsMinor = isMinor(dateOfBirth);

  // Gäller dialogen en enda order som redan har uppgiften är det den som ska
  // rättas. Annars är kontots förifyllning bästa gissningen.
  const single = orders.length === 1 ? orders[0] : null;
  const fallbackName =
    savedInvoice.invoiceName ?? (accountIsMinor ? "" : accountName);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoiceName: single?.invoiceName ?? fallbackName,
      invoiceEmail:
        single?.invoiceEmail ?? savedInvoice.invoiceEmail ?? accountEmail,
      invoicePhone: single?.invoicePhone ?? savedInvoice.invoicePhone ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    const res = await setOwnOrdersInvoiceRecipient(
      orders.map((o) => o.id),
      values,
    );

    if (!res.success) {
      toast.error(res.msg ?? t("checkout.invoice.heading"));
      return;
    }

    toast.success(res.msg ?? "");
    setIsOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("checkout.invoice.heading")}</DialogTitle>
          <DialogDescription>
            {accountIsMinor
              ? t("checkout.invoice.minorNotice")
              : t("user.orderInvoice.intro")}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <p className="mb-1 font-medium">
            {orders.length > 1
              ? t("user.orderInvoice.appliesToMany", { count: orders.length })
              : t("user.orderInvoice.appliesToOne")}
          </p>
          <ul className="space-y-0.5 text-muted-foreground">
            {orders.map((order) => (
              <li key={order.id} className="flex justify-between gap-3">
                <span className="font-mono">{order.id.slice(0, 8)}...</span>
                <span>{formatDateToInputStr(new Date(order.createdAt))}</span>
                <span>
                  {order.totalPrice != null
                    ? formatPrice(Number(order.totalPrice), lang)
                    : "-"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="invoiceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("checkout.invoice.name")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("checkout.invoice.namePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="invoiceEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("checkout.invoice.email")}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t("checkout.invoice.emailPlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("checkout.invoice.emailHelp")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="invoicePhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("checkout.invoice.phoneOptional")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("checkout.invoice.phonePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full"
            >
              {form.formState.isSubmitting
                ? t("user.editDetails.submitting")
                : t("user.editDetails.submit")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
