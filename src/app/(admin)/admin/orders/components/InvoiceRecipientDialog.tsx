"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setOrderInvoiceRecipient } from "@/lib/actions/invoice-actions";

type Props = {
  orderId: string;
  /** Kontoinnehavarens namn, som förslag när fakturamottagaren saknas. */
  accountName: string;
  accountEmail: string;
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
  invoiceName,
  invoiceEmail,
  invoicePhone,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    invoiceName: invoiceName ?? "",
    invoiceEmail: invoiceEmail ?? "",
    invoicePhone: invoicePhone ?? "",
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

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs" htmlFor={`inv-name-${orderId}`}>
              Betalningsansvarig
            </Label>
            <Input
              id={`inv-name-${orderId}`}
              value={form.invoiceName}
              placeholder="För- och efternamn"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, invoiceName: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs" htmlFor={`inv-mail-${orderId}`}>
              Skicka fakturan till
            </Label>
            <Input
              id={`inv-mail-${orderId}`}
              type="email"
              value={form.invoiceEmail}
              placeholder="namn@example.com"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, invoiceEmail: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs" htmlFor={`inv-phone-${orderId}`}>
              Telefon (valfri)
            </Label>
            <Input
              id={`inv-phone-${orderId}`}
              value={form.invoicePhone}
              placeholder="07X-XXX XX XX"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, invoicePhone: e.target.value }))
              }
            />
          </div>
        </div>

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
