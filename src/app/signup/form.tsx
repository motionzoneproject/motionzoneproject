"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { SignUpFormSchema } from "@/validations/betterauthforms";

const formSchema = SignUpFormSchema;
type FormValues = z.infer<typeof formSchema>;

export default function SignUpForm() {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/user";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
          confirmPassword: values.confirmPassword,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const { error } = await authClient.signIn.email({
          email: values.email,
          password: values.password,
        });

        if (error) {
          toast.error("Registrering lyckades, men inloggning misslyckades", {
            description: "Försök logga in manuellt.",
          });
          router.push("/signin");
        } else {
          toast.success("Konto skapat!", {
            description: "Välkommen till MotionZone!",
          });
          router.push(callbackUrl);
          router.refresh();
        }
      } else {
        const errorMessage =
          typeof result.error === "string"
            ? result.error
            : result.error?.body?.message ||
              result.error?.message ||
              "Registrering misslyckades.";
        toast.error("Registrering misslyckades", {
          description: errorMessage,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Ett nätverksfel inträffade";
      toast.error("Något gick fel", {
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
        <CardTitle>Skapa konto</CardTitle>
        <CardDescription>Fyll i dina uppgifter</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Namn</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ditt namn"
                      autoComplete="name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-post</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="din@epost.se"
                      autoComplete="email"
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
                  <FormLabel>Lösenord</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="********"
                      autoComplete="new-password"
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
                  <FormLabel>Bekräfta lösenord</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="********"
                      autoComplete="new-password"
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
              {form.formState.isSubmitting ? "Skapar konto..." : "Skapa konto"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
