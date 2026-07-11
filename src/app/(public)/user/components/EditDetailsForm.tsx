"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { notFound, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
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
import { Textarea } from "@/components/ui/textarea";
import type { UserDetails } from "@/generated/prisma/client";
import { changeDetails } from "@/lib/actions/auth-actions";
import { formatDateToInput } from "@/lib/date-utils";
import { useSession } from "@/lib/session-provider";
import { UserDetailsSchema } from "@/validations/userforms";

const formSchema = UserDetailsSchema;
type FormValues = z.infer<typeof formSchema>;

export function EditDetailsForm({ details }: { details: UserDetails }) {
  const { t } = useTranslation();
  const { user, session } = useSession();
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: details?.firstName ?? "",
      lastName: details?.lastName ?? "",
      phoneNumber: details?.phoneNumber ?? "",
      address: details?.address ?? "",
      postalCode: details.postalCode ?? "",
      city: details.city ?? "",
      dateOfBirth: formatDateToInput(details.dateOfBirth),
      bio: details.bio ?? "",
      allowPhotoVideo: details.allowPhotoVideo,
    },
  });

  const [isOpen, setIsOpen] = useState(false);

  // Reset för att gammal data annars visas.
  useEffect(() => {
    if (!isOpen) return;

    form.reset({
      firstName: details?.firstName ?? "",
      lastName: details?.lastName ?? "",
      phoneNumber: details?.phoneNumber ?? "",
      address: details?.address ?? "",
      postalCode: details.postalCode ?? "",
      city: details.city ?? "",
      dateOfBirth: formatDateToInput(details.dateOfBirth),
      bio: details.bio ?? "",
      allowPhotoVideo: details.allowPhotoVideo,
    });
  }, [
    isOpen,
    form,
    details.firstName,
    details.lastName,
    details.phoneNumber,
    details.address,
    details.postalCode,
    details.city,
    details.dateOfBirth,
    details.bio,
    details.allowPhotoVideo,
  ]);

  if (!session) return notFound();
  if (user?.id !== details.userId) return notFound();

  async function onSubmit(values: FormValues) {
    try {
      const result = await changeDetails(values);
      if (!result.success) {
        toast.error(t("user.editDetails.errorTitle"), {
          description: result.error,
        });
        return;
      }

      toast.success(t("user.editDetails.successToast"));
      setIsOpen(false);
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error(t("user.editDetails.unexpected"));
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="mx-2">
          <Pencil className="h-4 w-4" />
          {t("user.editDetails.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>{t("user.editDetails.title")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="md:grid md:grid-cols-2 md:gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("user.editDetails.firstName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("user.editDetails.firstName")}
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
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("user.editDetails.lastName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("user.editDetails.lastName")}
                        autoComplete="family-name"
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
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("user.editDetails.phone")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="070-123 45 67"
                      autoComplete="tel"
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
                  <FormLabel>{t("user.editDetails.address")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("user.editDetails.address")}
                      autoComplete="street-address"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="md:grid md:grid-cols-2 md:gap-4">
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("user.editDetails.postalCode")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123 45"
                        autoComplete="postal-code"
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
                    <FormLabel>{t("user.editDetails.city")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("user.editDetails.city")}
                        autoComplete="address-level2"
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
                  <FormLabel>{t("user.editDetails.dateOfBirth")}</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={formatDateToInput(field.value)}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("user.editDetails.bio")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("user.editDetails.bioPlaceholder")}
                      className="min-h-24"
                      {...field}
                    />
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
                    <FormLabel>{t("user.editDetails.allowPhoto")}</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full bg-brand hover:bg-brand-light text-white"
            >
              {form.formState.isSubmitting
                ? t("user.editDetails.submitting")
                : t("user.editDetails.submit")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
