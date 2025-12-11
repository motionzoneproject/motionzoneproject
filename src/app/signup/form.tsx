"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
  // From docs:
  const {
    data: session,
    // isPending, //loading state
    // error, //error object
    // refetch, //refetch the session
  } = authClient.useSession();
  const router = useRouter();

  const [signUpError, setSignUpError] = useState<{ msg: string }>({ msg: "" });

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
        // Sign in and go to user page!
        const { error } = await authClient.signIn.email({
          email: values.email,
          password: values.password,
        });
        if (error) {
          alert(error.message);
        } else {
          // Signed in
          // i use this because the sessionprovider wont be updated yet. so this reloads everything and then redirect.
          window.location.reload();
        }
      } else {
        const errorMessage =
          typeof result.error === "string"
            ? result.error
            : result.error?.body?.message ||
              result.error?.message ||
              "Signup failed.";
        setSignUpError({ msg: errorMessage });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Network error occurred";
      setSignUpError({ msg: errorMessage });
    }
  }

  // So after the reload (or if getting to this page with a session), goto user page!
  useEffect(() => {
    if (session) router.push("/user");
  }, [session, router]);

  if (session) return null; // Maybe unessasary?

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader>
        <CardTitle>Sign Up</CardTitle>
        <CardDescription>
          Enter your details below to create an Account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 bg-secondary text-white border-sky-200"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} className="border-sky-200" />
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} className="border-sky-200" />
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      {...field}
                      className=" border-sky-200"
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
                  <FormLabel>ConfirmPassword</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      {...field}
                      className=" border-sky-200"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="text-red-600 break-all">
              {signUpError.msg && signUpError.msg}
            </div>
            <Button className="w-full" type="submit">
              Sign Up
            </Button>
          </form>
        </Form>

        {form.formState.isSubmitting && (
          <div className="w-10 h-10 rounded-full border-2 border-purple-600 border-t-purple-300 animate-spin"></div>
        )}
      </CardContent>
    </Card>
  );
}
