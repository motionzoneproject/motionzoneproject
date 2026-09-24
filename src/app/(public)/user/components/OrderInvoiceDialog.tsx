"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  type InvoiceCandidate,
  InvoiceRecipientPicker,
  type InvoiceRecipientValue,
} from "@/components/InvoiceRecipientPicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { setOwnOrdersInvoiceRecipient } from "@/lib/actions/invoice-actions";
import { formatDateToInputStr } from "@/lib/date-utils";
import { isMinor, normalizeName } from "@/lib/invoice-recipient";
import { formatPrice } from "@/lib/money";
import type { AppLang } from "@/locales/config-lang";
import { normalizeLang } from "@/locales/config-lang";

export type InvoiceOrder = {
  id: string;
  createdAt: Date | string;
  totalPrice: number | string | unknown;
  invoiceName?: string | null;
  invoiceEmail?: string | null;
  invoicePhone?: string | null;
  orderItems?: {
    participant?: {
      id: string;
      name: string;
      dateOfBirth?: Date | string | null;
      email?: string | null;
    } | null;
  }[];
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
  const [isSaving, setIsSaving] = useState(false);

  // Kontot kan tillhöra ett barn, och då är kontonamnet fel svar.
  const accountIsMinor = isMinor(dateOfBirth);

  // Deltagarna på de ordrar dialogen gäller, var och en bara en gång.
  const candidates = useMemo(() => {
    const list: InvoiceCandidate[] = [
      {
        id: "self",
        kind: "self",
        name: accountName,
        email: accountEmail,
        dateOfBirth,
      },
    ];

    for (const order of orders) {
      for (const item of order.orderItems ?? []) {
        const participant = item.participant;
        if (!participant) continue;
        if (list.some((c) => c.id === participant.id)) continue;

        list.push({
          id: participant.id,
          kind: "participant",
          name: participant.name,
          email: participant.email,
          dateOfBirth: participant.dateOfBirth,
        });
      }
    }

    return list;
  }, [orders, accountName, accountEmail, dateOfBirth]);

  // Gäller dialogen en enda order som redan har uppgiften är det den som ska
  // rättas. Annars är kontots förifyllning bästa gissningen.
  const single = orders.length === 1 ? orders[0] : null;
  const startName = single?.invoiceName ?? savedInvoice.invoiceName ?? "";
  const startIsSelf =
    !accountIsMinor &&
    (startName === "" ||
      normalizeName(startName) === normalizeName(accountName));

  const [value, setValue] = useState<InvoiceRecipientValue>({
    kind: startIsSelf ? "self" : "other",
    invoiceName: startIsSelf ? "" : startName,
    invoiceEmail:
      single?.invoiceEmail ?? savedInvoice.invoiceEmail ?? accountEmail,
    invoicePhone: single?.invoicePhone ?? savedInvoice.invoicePhone ?? "",
    adultConfirmed: false,
  });

  const save = async () => {
    setIsSaving(true);
    try {
      const res = await setOwnOrdersInvoiceRecipient(
        orders.map((o) => o.id),
        value,
      );

      if (!res.success) {
        toast.error(res.msg ?? t("checkout.invoice.heading"));
        return;
      }

      toast.success(res.msg ?? "");
      setIsOpen(false);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

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

        <InvoiceRecipientPicker
          candidates={candidates}
          value={value}
          onChange={setValue}
          idPrefix={`order-${orders[0]?.id ?? "invoice"}`}
          labels={{
            whoPays: t("checkout.invoice.pickWho"),
            self: t("checkout.invoice.self"),
            other: t("checkout.invoice.other"),
            minorHint: t("checkout.invoice.minorHint"),
            years: t("checkout.invoice.years"),
            unknownAge: t("checkout.invoice.unknownAge"),
            nameLabel: t("checkout.invoice.name"),
            namePlaceholder: t("checkout.invoice.namePlaceholder"),
            emailLabel: t("checkout.invoice.email"),
            emailPlaceholder: t("checkout.invoice.emailPlaceholder"),
            emailHelp: t("checkout.invoice.emailHelp"),
            phoneLabel: t("checkout.invoice.phoneOptional"),
            phonePlaceholder: t("checkout.invoice.phonePlaceholder"),
            adultConfirm: t("checkout.invoice.adultConfirm"),
            adultConfirmHelp: t("checkout.invoice.adultConfirmHelp"),
            noOwnEmail: t("checkout.invoice.noOwnEmail"),
            emailToMinor: t("checkout.invoice.emailToMinor"),
          }}
        />

        <Button type="button" onClick={save} disabled={isSaving}>
          {isSaving
            ? t("user.editDetails.submitting")
            : t("user.editDetails.submit")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
