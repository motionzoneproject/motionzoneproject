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
        toast.error("Registrering misslyckades", {
          description: result.error,
        });
        return;
      }

      toast.success("Konto skapat!", {
        description: "Välkommen till MotionZone! Logga in för att fortsätta.",
      });

      // Reset form to clear inputs
      form.reset();

      // Use replace to avoid back-button issues and redirect to signin
      router.replace(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Förnamn</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Förnamn"
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
                    <FormLabel required>Efternamn</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Efternamn"
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
                  <FormLabel required>E-post</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="din@epost.se"
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
                  <FormLabel required>Telefonnummer</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="070-123 45 67"
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
                  <FormLabel required>Gatuadress</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Gatuadress"
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
                    <FormLabel required>Postnummer</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123 45"
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
                    <FormLabel required>Ort</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ort"
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
                  <FormLabel required>Födelsedatum</FormLabel>
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
                    <FormLabel>
                      Jag godkänner att foton och videor på mig får delas
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Lösenord</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="********"
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
                  <FormLabel required>Bekräfta lösenord</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="********"
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
              {form.formState.isSubmitting ? "Skapar konto..." : "Skapa konto"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
