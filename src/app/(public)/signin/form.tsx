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
  password: z.string().min(8, "Lösenordet måste vara minst 8 tecken").max(50),
});

type FormValues = z.infer<typeof FormSchema>;

export default function SignInForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/user";

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: FormValues) {
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    if (error) {
      toast.error(t("signin.errorTitle"), {
        description: error.message || t("signin.errorFallback"),
      });
    } else {
      toast.success(t("signin.successToast"));
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("signin.cardTitle")}</CardTitle>
        <CardDescription>{t("signin.cardDescription")}</CardDescription>
        <CardAction>
          <Button asChild variant="link" className="text-brand p-0">
            <Link href="/signup">{t("signin.createAccount")}</Link>
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
                  <FormLabel required>{t("signin.email")}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t("signin.emailPlaceholder")}
                      autoComplete="email"
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("signin.password")}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t("signin.passwordPlaceholder")}
                      autoComplete="current-password"
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
                ? t("signin.submitting")
                : t("signin.submit")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
