"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { notFound, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { changePassword } from "@/lib/actions/auth";
import { useSession } from "@/lib/session-provider";
import { UserPasswordSchema } from "@/validations/userforms";

const formSchema = UserPasswordSchema;
type FormValues = z.infer<typeof formSchema>;

export function EditPwForm() {
  const { session } = useSession();
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      oldPassword: "",
      password: "",
      confirmPassword: "",
    },
  });

  const [isOpen, setIsOpen] = useState(false);

  if (!session) return notFound();

  async function onSubmit(values: FormValues) {
    try {
      const result = await changePassword(values);
      if (!result.success) {
        toast.error("Kunde inte ändra lösenord", {
          description: result.error,
        });
        return;
      }

      toast.success("Lösenordet ändrades.");
      setIsOpen(false);
      router.refresh();
    } catch (e) {
      console.error(e, JSON.stringify(values));
      toast.error(JSON.stringify(e));
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="mx-2">
          <Pencil className="h-4 w-4" />
          Ändra lösenord
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Ändra ditt lösenord</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="oldPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nuvarande lösenord:</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Skriv ditt lösenord..."
                      autoComplete="given-name"
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
                  <FormLabel>Nytt lösenord</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Skriv nytt lösenord..."
                      autoComplete="family-name"
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
                  <FormLabel>Bekräfta lösenordet</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Skriv nya lösenordet igen..."
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
              {form.formState.isSubmitting ? "Sparar..." : "Spara ändringar"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
