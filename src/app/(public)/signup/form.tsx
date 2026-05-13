"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { signUpWithDetails } from "@/lib/actions/auth";
import { authClient } from "@/lib/auth-client";
import { SignUpFormSchema } from "@/validations/betterauthforms";

const formSchema = SignUpFormSchema;
type FormValues = z.infer<typeof formSchema>;

export default function SignUpForm() {
  const { t } = useTranslation();
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/user";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phoneNumber: "",
      address: "",
      postalCode: "",
      city: "",
      dateOfBirth: "",
      allowPhotoVideo: false,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const result = await signUpWithDetails(values);

      if (!result.success) {
        toast.error(t("signup.errorTitle"), {
          description: result.error,
        });
        return;
      }

      toast.success(t("signup.successTitle"), {
        description: t("signup.successDescription"),
      });

      // Reset form to clear inputs
      form.reset();

      // Use replace to avoid back-button issues and redirect to signin
      router.replace(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : t("signup.networkErrorFallback");
      toast.error(t("signup.networkErrorTitle"), {
        description: errorMessage,
      });
    }
  }

  useEffect(() => {
    if (session) router.push(callbackUrl);
  }, [session, router, callbackUrl]);

  if (session) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("signup.cardTitle")}</CardTitle>
        <CardDescription>{t("signup.cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t("signup.firstName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("signup.firstNamePlaceholder")}
                        autoComplete="given-name"
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
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t("signup.lastName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("signup.lastNamePlaceholder")}
                        autoComplete="family-name"
                        aria-required="true"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("signup.email")}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t("signup.emailPlaceholder")}
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
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("signup.phone")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("signup.phonePlaceholder")}
                      autoComplete="tel"
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
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("signup.address")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("signup.addressPlaceholder")}
                      autoComplete="street-address"
                      aria-required="true"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t("signup.postalCode")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("signup.postalCodePlaceholder")}
                        autoComplete="postal-code"
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
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t("signup.city")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("signup.cityPlaceholder")}
                        autoComplete="address-level2"
                        aria-required="true"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("signup.dateOfBirth")}</FormLabel>
                  <FormControl>
                    <Input type="date" aria-required="true" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allowPhotoVideo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t("signup.allowPhoto")}</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("signup.password")}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t("signup.passwordPlaceholder")}
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
                  <FormLabel required>{t("signup.confirmPassword")}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t("signup.passwordPlaceholder")}
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
                ? t("signup.submitting")
                : t("signup.submit")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
