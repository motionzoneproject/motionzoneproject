"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { adminUpdateUserDetails } from "@/lib/actions/user-management";
import { getAdminUserFormDefaults } from "@/lib/admin-user-form-defaults";
import { formatDateToInputStr } from "@/lib/date-utils";
import { AdminEditUserSchema } from "@/validations/userforms";

type FormValues = z.infer<typeof AdminEditUserSchema>;

type UserForEdit = {
  id: string;
  name: string;
  details: {
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
    address: string | null;
    postalCode: string | null;
    city: string | null;
    dateOfBirth: Date | string | null;
    allowPhotoVideo?: boolean | null;
  } | null;
};

export default function StudentUserEditDialog({ user }: { user: UserForEdit }) {
  const id = useId();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(AdminEditUserSchema),
    defaultValues: getAdminUserFormDefaults({
      ...user,
      details: user.details
        ? {
            ...user.details,
            dateOfBirth: formatDateToInputStr(user.details.dateOfBirth),
          }
        : null,
    }),
  });

  useEffect(() => {
    if (!isOpen) return;

    form.reset(
      getAdminUserFormDefaults({
        ...user,
        details: user.details
          ? {
              ...user.details,
              dateOfBirth: formatDateToInputStr(user.details.dateOfBirth),
            }
          : null,
      }),
    );
  }, [form, isOpen, user]);

  async function onSubmit(values: FormValues) {
    const result = await adminUpdateUserDetails(user.id, values);

    if (!result.success) {
      toast.error("Kunde inte uppdatera användaren", {
        description: result.error,
      });
      return;
    }

    toast.success("Användaren uppdaterad");
    setIsOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Redigera användare</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        id={id}
        className="max-h-[90dvh] overflow-auto sm:max-w-[520px]"
      >
        <DialogHeader>
          <DialogTitle>Redigera användare</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Förnamn</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Efternamn</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefon</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>Adress</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <FormLabel>Postnummer</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Ort</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                  <FormLabel>Födelsedatum</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
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
                      Godkänner foto/video för sociala medier
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Avbryt
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Sparar..." : "Spara"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
