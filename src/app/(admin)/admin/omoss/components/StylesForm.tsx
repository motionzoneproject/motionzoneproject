"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import ImageInput from "@/components/ImageInput";
import LanguageSwitcherInput from "@/components/LanguageSwitcherInput";
import Loader from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
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
  initialLang?: "sv" | "en";
};

export function StylesForm({
  style,
  onSuccess,
  initialLang = "sv",
}: StylesFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const form = useForm({
    resolver: zodResolver(adminStyleSchema),
    defaultValues: {
      name: style?.name ?? "",
      name_en: style?.name_en ?? "",
      description: style?.description ?? "",
      description_en: style?.description_en ?? "",
      imageUrl: style?.imageUrl ?? "",
      active: style?.active ?? true,
    },
  });

  const [formLang, setFormLang] = useState(initialLang);

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
    <div>
      <div className="p2 text-sm my-2">
        Formulärspråk:{" "}
        <LanguageSwitcherInput
          value={formLang ?? "sv"}
          setValue={(e) => setFormLang(e === "en" ? "en" : "sv")}
        />
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className={`${formLang === "sv" ? "" : "hidden"}`}>
                <FormLabel>Namn ({formLang})</FormLabel>
                <FormControl>
                  <Input placeholder="t.ex. Studio 1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name_en"
            render={({ field }) => (
              <FormItem className={`${formLang === "sv" ? "hidden" : ""}`}>
                <FormLabel>Namn ({formLang})</FormLabel>
                <FormControl>
                  <Input placeholder="t.ex. Studio 1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className={`${formLang === "sv" ? "" : "hidden"}`}>
                <FormLabel>Beskrivning ({formLang})</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Beskriv stilen..."
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
            name="description_en"
            render={({ field }) => (
              <FormItem className={`${formLang === "sv" ? "hidden" : ""}`}>
                <FormLabel>Beskrivning ({formLang})</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Beskriv stilen..."
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

          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                <FormControl>
                  <Checkbox
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Visa</FormLabel>
                  <FormDescription>
                    Om avmarkerad visas inte dansstilen på "Om oss"-sidan.
                  </FormDescription>
                </div>
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
    </div>
  );
}
