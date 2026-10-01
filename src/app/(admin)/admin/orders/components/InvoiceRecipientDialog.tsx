"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { setOrderInvoiceRecipient } from "@/lib/actions/invoice-actions";
import { normalizeName } from "@/lib/invoice-recipient";

type Props = {
  orderId: string;
  /** Kontoinnehavarens namn, som förslag när fakturamottagaren saknas. */
  accountName: string;
  accountEmail: string;
  accountDateOfBirth?: Date | string | null;
  /** Deltagarna på ordern, som alternativ att välja bland. */
  participants: {
    id: string;
    name: string;
    email?: string | null;
    dateOfBirth?: Date | string | null;
  }[];
  invoiceName: string | null;
  invoiceEmail: string | null;
  invoicePhone: string | null;
};

/**
 * Låter admin fylla i eller rätta fakturamottagaren på en order.
 *
 * Ordrar från innan fältet fanns saknar uppgiften helt, och studion har den
 * oftast redan i sin mejlväxling med kunden.
 */
export function InvoiceRecipientDialog({
  orderId,
  accountName,
  accountEmail,
  accountDateOfBirth,
  participants,
  invoiceName,
  invoiceEmail,
  invoicePhone,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const candidates = useMemo<InvoiceCandidate[]>(
    () => [
      {
        id: "self",
        kind: "self",
        name: accountName,
        email: accountEmail,
        dateOfBirth: accountDateOfBirth,
      },
      ...participants.map((p) => ({
        id: p.id,
        kind: "participant" as const,
        name: p.name,
        email: p.email,
        dateOfBirth: p.dateOfBirth,
      })),
    ],
    [accountName, accountEmail, accountDateOfBirth, participants],
  );

  // En uppgift som redan finns är oftast någon annan än kontoinnehavaren —
  // det är därför den fylldes i. Matchar den kontot börjar vi där i stället.
  const startIsSelf =
    !!accountName &&
    (!invoiceName || normalizeName(invoiceName) === normalizeName(accountName));

  const [form, setForm] = useState<InvoiceRecipientValue>({
    kind: startIsSelf ? "self" : "other",
    invoiceName: startIsSelf ? "" : (invoiceName ?? ""),
    invoiceEmail: invoiceEmail ?? "",
    invoicePhone: invoicePhone ?? "",
    adultConfirmed: false,
  });

  const missing = !invoiceName;

  const save = async () => {
    setIsSaving(true);
    try {
      const res = await setOrderInvoiceRecipient(orderId, form);
      if (!res.success) {
        toast.error(res.msg ?? "Kunde inte spara.");
        return;
      }
      toast.success(res.msg ?? "Sparat.");
      setIsOpen(false);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`px-2 py-0.5 rounded text-[9px] font-semibold tracking-wide uppercase transition-all ${
            missing
              ? "bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25"
              : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
          }`}
        >
          {missing ? "Faktura saknas" : "Fakturauppgifter"}
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vem ska få fakturan?</DialogTitle>
          <DialogDescription>
            Kontot står på {accountName} ({accountEmail}), men betalaren kan
            vara någon annan. Namnet är den betalningsansvariga, e-posten bara
            adressen fakturan skickas till.
          </DialogDescription>
        </DialogHeader>

        <InvoiceRecipientPicker
          candidates={candidates}
          value={form}
          onChange={setForm}
          idPrefix={`inv-${orderId}`}
          labels={{
            whoPays: "Vem ska betala?",
            self: "Kontoinnehavaren",
            other: "Annan person",
            minorHint: "kan inte faktureras",
            years: "år",
            unknownAge: "ålder saknas",
            nameLabel: "Betalningsansvarig",
            namePlaceholder: "För- och efternamn",
            emailLabel: "Skicka fakturan till",
            emailPlaceholder: "namn@example.com",
            emailHelp:
              "Adressen fakturan skickas till. Får vara deltagarens egen.",
            phoneLabel: "Telefon (valfri)",
            phonePlaceholder: "07X-XXX XX XX",
            adultConfirm: "Personen är över 18 år",
            adultConfirmHelp:
              "Vi har inget födelsedatum för den här personen, och en omyndig kan inte faktureras.",
            noOwnEmail:
              "{{name}} har ingen egen e-postadress, så adressen ovan är kontots.",
            emailToMinor:
              "Adressen tillhör kontot, som står på en person under 18 år. Fyll hellre i betalarens egen adress.",
          }}
        />

        <DialogFooter className="sm:justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsOpen(false)}
          >
            Avbryt
          </Button>
          <Button type="button" onClick={save} disabled={isSaving}>
            {isSaving ? "Sparar..." : "Spara"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
