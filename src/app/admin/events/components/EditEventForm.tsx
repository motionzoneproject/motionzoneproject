"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import ImageInput from "@/components/ImageInput";
import Loader from "@/components/Loader";
// import Loader from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import type { Event } from "@/generated/prisma/client";
import { editNewEvent } from "@/lib/actions/admin";
import { formatDateToInput } from "@/lib/date-utils";
import { uploadImageFromBlob } from "@/lib/uploads";
import { adminEditEventSchema } from "@/validations/adminforms";

const formSchema = adminEditEventSchema;

type FormInput = z.input<typeof adminEditEventSchema>;
type FormOutput = z.output<typeof adminEditEventSchema>;

interface Props {
  event: Event;
  isOpen: boolean;
  onSuccess?: () => void;
}

export default function EditEventForm({ event, isOpen, onSuccess }: Props) {
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: event.id,
      headline: event.headline,
      description: event.description,
      link: event.link,
      imageURL: event.imageURL,
      startDate: event.startDate,
      endDate: event.endDate,
    },
  });

  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;

    form.reset({
      id: event.id,
      headline: event.headline,
      description: event.description,
      link: event.link,
      imageURL: event.imageURL,
      startDate: event.startDate,
      endDate: event.endDate,
    });
  }, [
    isOpen,
    form,
    event.id,
    event.headline,
    event.description,
    event.link,
    event.imageURL,
    event.startDate,
    event.endDate,
  ]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    let finalImageURL = values.imageURL ?? "";

    if (finalImageURL.startsWith("blob:")) {
      try {
        const res = await fetch(finalImageURL);
        const blob = await res.blob();
        finalImageURL = await uploadImageFromBlob(blob);
        URL.revokeObjectURL(values.imageURL ?? "");
      } catch (e) {
        console.error(e);
        toast.error(`Uppladdning misslyckades.`);
        return;
      }
    }

    const res = await editNewEvent({ ...values, imageURL: finalImageURL });
    if (res.success) {
      toast.success(res.msg);
      onSuccess?.();
      router.refresh();
    } else {
      toast.error(res.msg);
    }
  }

  const isBusy = form.formState.isSubmitting || form.formState.isValidating;

  return (
    <Card>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-2 p-2 rounded-xl"
          >
            <FormField
              control={form.control}
              name="id"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input type="hidden" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="headline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rubrik</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beskrivning</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start datum</FormLabel>

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
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slut datum</FormLabel>

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
              name="link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Länk</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageURL"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bildlänk</FormLabel>
                  <FormControl>
                    <ImageInput {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isBusy && <Loader />}
            <Button
              type="submit"
              variant="secondary"
              className="w-full"
              disabled={isBusy}
            >
              {isBusy ? "Uppdaterar..." : "Uppdatera event"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
