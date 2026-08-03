"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import ImageInput from "@/components/ImageInput";
import LanguageSwitcherInput from "@/components/LanguageSwitcherInput";
import Loader from "@/components/Loader";
import { RichTextEditor } from "@/components/RichTextEditor";
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
import type { Studio } from "@/generated/prisma/client";
import { createStudio, updateStudio } from "@/lib/actions/studio-actions";
import { uploadImageFromBlob } from "@/lib/uploads";
import { adminStudioSchema } from "@/validations/adminforms";

type StudioFormProps = {
  studio?: Studio;
  initialLang?: "sv" | "en";
  onSuccess?: () => void;
};

export function StudioForm({
  studio,
  onSuccess,
  initialLang = "sv",
}: StudioFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const form = useForm({
    resolver: zodResolver(adminStudioSchema),
    defaultValues: {
      name: studio?.name ?? "",
      name_en: studio?.name_en ?? "",
      description: studio?.description ?? "",
      description_en: studio?.description_en ?? "",
      imageUrl: studio?.imageUrl ?? "",
      active: studio?.active ?? true,
    },
  });

  const [formLang, setFormLang] = useState(initialLang);
  const errors = form.formState.errors;

  useEffect(() => {
    if (errors.name || errors.description) {
      setFormLang("sv");
    } else if (errors.name_en || errors.description_en) {
      setFormLang("en");
    }
  }, [errors]);

  async function onSubmit(values: z.infer<typeof adminStudioSchema>) {
    setIsPending(true);
    try {
      const oldImageUrl = studio?.imageUrl ?? "";
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

      const result = studio
        ? await updateStudio(studio.id, {
            ...values,
            imageUrl: finalImageURL,
          })
        : await createStudio({
            ...values,
            imageUrl: finalImageURL,
          });

      if (result.success) {
        if (studio && oldImageUrl && finalImageURL !== oldImageUrl) {
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
      <div className="sticky top-4 z-50 flex justify-end pointer-events-none -mb-6">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-brand/70 bg-background/50 px-3 py-2 shadow-sm backdrop-blur-sm">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Språk:
          </span>
          <LanguageSwitcherInput
            value={formLang ?? "sv"}
            setValue={(e) => setFormLang(e === "en" ? "en" : "sv")}
          />
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className={formLang === "en" ? "hidden" : ""}>
                <FormLabel>Namn (sv)</FormLabel>
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
              <FormItem className={formLang === "sv" ? "hidden" : ""}>
                <FormLabel>Namn (en)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Studio 1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className={formLang === "en" ? "hidden" : ""}>
                <FormLabel>Beskrivning (sv)</FormLabel>
                <FormControl>
                  <RichTextEditor
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Skriv beskrivning..."
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
              <FormItem className={formLang === "sv" ? "hidden" : ""}>
                <FormLabel>Beskrivning (en)</FormLabel>
                <FormControl>
                  <RichTextEditor
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Write description..."
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
                    Om avmarkerad visas inte studion på "Om oss"-sidan.
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
            ) : studio ? (
              <Save className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {isPending ? "Sparar..." : studio ? "Spara" : "Skapa"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
