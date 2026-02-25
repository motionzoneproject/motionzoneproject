"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import ImageInput from "@/components/ImageInput";
import Loader from "@/components/Loader";
import { Button } from "@/components/ui/button";
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
import type { Style } from "@/generated/prisma/client";
import { createStyle, updateStyle } from "@/lib/actions/style-actions";
import { uploadImageFromBlob } from "@/lib/uploads";
import { adminStyleSchema } from "@/validations/adminforms";

type StylesFormProps = {
  style?: Style;
  onSuccess?: () => void;
};

export function StylesForm({ style, onSuccess }: StylesFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const form = useForm({
    resolver: zodResolver(adminStyleSchema),
    defaultValues: {
      name: style?.name ?? "",
      description: style?.description ?? "",
      imageUrl: style?.imageUrl ?? "",
    },
  });

  async function onSubmit(values: z.infer<typeof adminStyleSchema>) {
    setIsPending(true);
    try {
      const oldImageUrl = style?.imageUrl ?? "";
      let finalImageURL = values.imageUrl ?? "";

      if (finalImageURL.startsWith("blob:")) {
        try {
          const res = await fetch(finalImageURL);
          const blob = await res.blob();
          finalImageURL = await uploadImageFromBlob(blob);
          URL.revokeObjectURL(values.imageUrl ?? "");
        } catch (e) {
          console.error(e);
          toast.error("Uppladdning misslyckades.");
          return;
        }
      }

      const result = style
        ? await updateStyle(style.id, {
            ...values,
            imageUrl: finalImageURL,
          })
        : await createStyle({
            ...values,
            imageUrl: finalImageURL,
          });

      if (result.success) {
        if (style && oldImageUrl && finalImageURL !== oldImageUrl) {
          try {
            const removeRes = await fetch("/api/remove", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: oldImageUrl }),
            });

            const removeData = await removeRes.json().catch(() => null);
            if (!removeRes.ok) {
              throw new Error(removeData?.error || "Remove failed");
            }
            toast("Gammal bild borttagen");
          } catch (err) {
            toast(String(err));
          }
        }

        toast.success(result.msg);
        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
          form.reset();
        }
      } else {
        toast.error(result.msg);
      }
    } catch (error) {
      toast.error("Något gick fel.");
      console.error(error);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Namn</FormLabel>
              <FormControl>
                <Input placeholder="t.ex. Street Jazz" {...field} />
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
                <Textarea
                  placeholder="Beskriv dansstilen..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bild</FormLabel>
              <FormControl>
                <ImageInput {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          variant="ghost"
          type="submit"
          className="w-full"
          disabled={isPending}
        >
          {isPending ? (
            <Loader />
          ) : style ? (
            <Save className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {isPending ? "Sparar..." : style ? "Spara" : "Skapa"}
        </Button>
      </form>
    </Form>
  );
}
