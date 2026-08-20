"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
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

const FormSchema = z
  .object({
    password: z.string().min(8, "Lösenordet måste vara minst 8 tecken").max(50),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Lösenorden matchar inte",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof FormSchema>;

export default function ResetPasswordForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  // better-auth validates the token before redirecting here, and sends
  // ?error=INVALID_TOKEN instead when it is expired or already used.
  const token = searchParams.get("token");
  const linkError = searchParams.get("error");

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (!token) return;

    const { error } = await authClient.resetPassword({
      newPassword: values.password,
      token,
    });

    if (error) {
      toast.error(t("resetPassword.errorTitle"), {
        description: error.message || t("resetPassword.errorFallback"),
      });
      return;
    }

    toast.success(t("resetPassword.successToast"));
    router.push("/signin");
    router.refresh();
  }

  if (!token || linkError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("resetPassword.invalidTitle")}</CardTitle>
          <CardDescription>
            {t("resetPassword.invalidDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            asChild
            className="w-full bg-brand hover:bg-brand-light text-white"
          >
            <Link href="/forgot-password">
              {t("resetPassword.requestNewLink")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("resetPassword.cardTitle")}</CardTitle>
        <CardDescription>{t("resetPassword.cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("resetPassword.password")}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t("resetPassword.passwordPlaceholder")}
                      autoComplete="new-password"
                      aria-required="true"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>
                    {t("resetPassword.confirmPassword")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t("resetPassword.passwordPlaceholder")}
                      autoComplete="new-password"
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
                ? t("resetPassword.submitting")
                : t("resetPassword.submit")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
