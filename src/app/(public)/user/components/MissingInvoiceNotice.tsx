"use client";

import { ReceiptText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { type InvoiceOrder, OrderInvoiceDialog } from "./OrderInvoiceDialog";

/**
 * Högst upp på profilsidan: ordrar som saknar fakturamottagare.
 *
 * Fakturan skickas manuellt långt efter anmälan, så en order utan uppgiften
 * blir ett telefonsamtal från studion. Kunden vet svaret själv och kan fylla i
 * alla på en gång härifrån.
 */
export function MissingInvoiceNotice({
  orders,
  accountName,
  accountEmail,
  dateOfBirth,
  savedInvoice,
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
}) {
  const { t } = useTranslation();

  if (orders.length === 0) return null;

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-lg border border-amber-400/60 bg-amber-50 px-3 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300">
      <div className="flex items-start gap-2">
        <ReceiptText className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {orders.length > 1
            ? t("user.orderInvoice.missingMany", { count: orders.length })
            : t("user.orderInvoice.missingOne")}
        </span>
      </div>

      <OrderInvoiceDialog
        orders={orders}
        accountName={accountName}
        accountEmail={accountEmail}
        dateOfBirth={dateOfBirth}
        savedInvoice={savedInvoice}
        trigger={
          <Button size="sm" className="shrink-0 self-start sm:self-auto">
            {t("user.orderInvoice.fillIn")}
          </Button>
        }
      />
    </div>
  );
}
