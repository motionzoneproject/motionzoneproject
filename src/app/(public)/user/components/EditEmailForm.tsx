"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { notFound, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { changeMail } from "@/lib/actions/auth-actions";
import { useSession } from "@/lib/session-provider";
import { UserEmailSchema } from "@/validations/userforms";

const formSchema = UserEmailSchema;
type FormValues = z.infer<typeof formSchema>;

export function EditEmailForm() {
  const { t } = useTranslation();
  const { session, user } = useSession();
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentEmail: user?.email ?? "",
      email: user?.email ?? "",
    },
  });

  const [isOpen, setIsOpen] = useState(false);

  if (!session) return notFound();

  async function onSubmit(values: FormValues) {
    try {
      const result = await changeMail(values);

      if (!result.success) {
        toast.error(t("user.editMail.errorTitle"), {
          description: result.error,
        });
        return;
      }

      toast.success(t("user.editMail.successToast"));
      setIsOpen(false);
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error(t("user.editMail.unexpected"));
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="mx-2">
          <Pencil className="h-4 w-4" />
          {t("user.editMail.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>{t("user.editMail.title")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("user.editMail.new")}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t("user.editMail.newPlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currentEmail"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormLabel>{t("user.editMail.confirm")}</FormLabel>
                  <FormControl>
                    <Input
                      type="hidden"
                      autoComplete="family-name"
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
              className="w-full bg-brand hover:bg-brand-light text-white"
            >
              {form.formState.isSubmitting
                ? t("user.editMail.submitting")
                : t("user.editMail.submit")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
