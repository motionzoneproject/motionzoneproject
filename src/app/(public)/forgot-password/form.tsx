"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const FormSchema = z.object({
  email: z.string().email("Ogiltig e-postadress").max(100),
});

type FormValues = z.infer<typeof FormSchema>;

export default function ForgotPasswordForm() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: FormValues) {
    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      // Absolute URL so better-auth doesn't have to infer the origin.
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(t("forgotPassword.errorTitle"), {
        description: error.message || t("forgotPassword.errorFallback"),
      });
      return;
    }

    // Deliberately the same outcome whether or not the address exists, so the
    // form can't be used to find out who has an account here.
    setSent(true);
    toast.success(t("forgotPassword.successToast"));
  }

  if (sent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("forgotPassword.sentTitle")}</CardTitle>
          <CardDescription>
            {t("forgotPassword.sentDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            asChild
            className="w-full bg-brand hover:bg-brand-light text-white"
          >
            <Link href="/signin">{t("forgotPassword.backToSignIn")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("forgotPassword.cardTitle")}</CardTitle>
        <CardDescription>{t("forgotPassword.cardDescription")}</CardDescription>
        <CardAction>
          <Button asChild variant="link" className="text-brand p-0">
            <Link href="/signin">{t("forgotPassword.backToSignIn")}</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("forgotPassword.email")}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t("forgotPassword.emailPlaceholder")}
                      autoComplete="email"
                      aria-required="true"
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
                ? t("forgotPassword.submitting")
                : t("forgotPassword.submit")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
