"use client";

import { ReceiptText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
import { saveInvoiceRecipient } from "@/lib/actions/invoice-actions";
import { isMinor, normalizeName } from "@/lib/invoice-recipient";

/**
 * Kontots sparade fakturamottagare â€” fÃ¶rifyllningen till nÃ¤sta anmÃ¤lan.
 *
 * Samma val som i kassan, men utan intyget om Ã¥lder: hÃ¤r stÃ¤lls ingen faktura
 * ut. Intyget hÃ¶r till ordern och begÃ¤rs nÃ¤r anmÃ¤lan gÃ¶rs.
 */
export function InvoiceRecipientForm({
  accountName,
  accountEmail,
  dateOfBirth,
  invoiceName,
  invoiceEmail,
  invoicePhone,
  participants,
}: {
  accountName: string;
  accountEmail: string;
  dateOfBirth: Date | null;
  invoiceName: string | null;
  invoiceEmail: string | null;
  invoicePhone: string | null;
  participants: {
    id: string;
    name: string;
    email?: string | null;
    dateOfBirth?: Date | string | null;
  }[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Ã„r kontot registrerat pÃ¥ ett barn kan fakturan inte gÃ¥ till samma person.
  const accountIsMinor = isMinor(dateOfBirth);

  const candidates = useMemo<InvoiceCandidate[]>(
    () => [
      {
        id: "self",
        kind: "self",
        name: accountName,
        email: accountEmail,
        dateOfBirth,
      },
      ...participants.map((p) => ({
        id: p.id,
        kind: "participant" as const,
        name: p.name,
        email: p.email,
        dateOfBirth: p.dateOfBirth,
      })),
    ],
    [accountName, accountEmail, dateOfBirth, participants],
  );

  const startIsSelf =
    !accountIsMinor &&
    (!invoiceName || normalizeName(invoiceName) === normalizeName(accountName));

  const [value, setValue] = useState<InvoiceRecipientValue>({
    kind: startIsSelf ? "self" : "other",
    invoiceName: startIsSelf ? "" : (invoiceName ?? ""),
    invoiceEmail: invoiceEmail ?? accountEmail,
    invoicePhone: invoicePhone ?? "",
    adultConfirmed: false,
  });

  const save = async () => {
    setIsSaving(true);
    try {
      const res = await saveInvoiceRecipient(value);

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
      <DialogTrigger asChild>
        <Button variant="ghost" className="justify-start sm:justify-center">
          <ReceiptText className="h-4 w-4" />
          {t("checkout.invoice.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("checkout.invoice.heading")}</DialogTitle>
          <DialogDescription>
            {accountIsMinor
              ? t("checkout.invoice.minorNotice")
              : t("user.orderInvoice.savedHelp")}
          </DialogDescription>
        </DialogHeader>

        <InvoiceRecipientPicker
          candidates={candidates}
          value={value}
          onChange={setValue}
          idPrefix="saved-invoice"
          requireConfirmation={false}
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
