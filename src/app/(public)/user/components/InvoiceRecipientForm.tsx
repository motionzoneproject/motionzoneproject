"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ReceiptText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { saveInvoiceRecipient } from "@/lib/actions/invoice-actions";
import { isMinor } from "@/lib/invoice-recipient";
import { InvoiceRecipientSchema } from "@/validations/userforms";

const formSchema = InvoiceRecipientSchema;
type FormValues = z.infer<typeof formSchema>;

export function InvoiceRecipientForm({
  accountName,
  accountEmail,
  dateOfBirth,
  invoiceName,
  invoiceEmail,
  invoicePhone,
}: {
  accountName: string;
  accountEmail: string;
  dateOfBirth: Date | null;
  invoiceName: string | null;
  invoiceEmail: string | null;
  invoicePhone: string | null;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // Är kontot registrerat på ett barn kan fakturan inte gå till samma person,
  // så då förifyller vi ingenting — den vuxna måste skrivas in.
  const accountIsMinor = isMinor(dateOfBirth);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoiceName: invoiceName ?? (accountIsMinor ? "" : accountName),
      invoiceEmail: invoiceEmail ?? accountEmail,
      invoicePhone: invoicePhone ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    const res = await saveInvoiceRecipient(values);

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
              : t("checkout.invoice.intro")}
          </DialogDescription>
        </DialogHeader>

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
