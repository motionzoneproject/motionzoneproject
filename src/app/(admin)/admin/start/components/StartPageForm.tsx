"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import ImageInput from "@/components/ImageInput";
import Loader from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { StartPageContent } from "@/generated/prisma/client";
import { updateStartPageContent } from "@/lib/actions/start-page-actions";
import { uploadImageFromBlob } from "@/lib/uploads";
import { adminStartPageSchema } from "@/validations/adminforms";

type StartPageFormProps = {
  content: StartPageContent;
};

type FormValues = z.infer<typeof adminStartPageSchema>;

// Image fields that may need blob → S3 upload
const IMAGE_FIELDS = [
  "heroImage",
  "feature1Image",
  "feature2Image",
  "feature3Image",
] as const satisfies ReadonlyArray<keyof FormValues>;

async function resolveImageField(
  current: string,
  original: string,
): Promise<{ url: string; oldUrl: string | null }> {
  if (!current.startsWith("blob:")) {
    return { url: current, oldUrl: null };
  }
  const res = await fetch(current);
  const blob = await res.blob();
  const uploaded = await uploadImageFromBlob(blob);
  URL.revokeObjectURL(current);
  // Only mark old URL for deletion if it changed and is an external (S3) URL
  const oldUrl =
    original && original !== uploaded && original.startsWith("http")
      ? original
      : null;
  return { url: uploaded, oldUrl };
}

async function removeOldImage(url: string) {
  try {
    const res = await fetch("/api/remove", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      console.warn(
        "Could not remove old image:",
        data?.error ?? res.statusText,
      );
    }
  } catch (err) {
    console.warn("Could not remove old image:", err);
  }
}

// Schema-level default images — used to reset a removed image back to the original default
const IMAGE_DEFAULTS = {
  heroImage: "/hero.png",
  feature1Image: "/professionella-instruktörer.png",
  feature2Image: "/flexibla-kurstider.png",
  feature3Image: "/moderna-lokaler.png",
} as const;

export function StartPageForm({ content }: StartPageFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(adminStartPageSchema),
    defaultValues: {
      heroImage: content.heroImage,
      heroLabel: content.heroLabel,
      heroTitleLine1: content.heroTitleLine1,
      heroTitleAccent: content.heroTitleAccent,
      heroTitleLine2: content.heroTitleLine2,
      heroSubtext: content.heroSubtext,
      featuresTitle: content.featuresTitle,
      featuresSubtext: content.featuresSubtext,
      feature1Image: content.feature1Image,
      feature1Title: content.feature1Title,
      feature1Description: content.feature1Description,
      feature2Image: content.feature2Image,
      feature2Title: content.feature2Title,
      feature2Description: content.feature2Description,
      feature3Image: content.feature3Image,
      feature3Title: content.feature3Title,
      feature3Description: content.feature3Description,
    },
  });

  async function onSubmit(values: FormValues) {
    setIsPending(true);
    try {
      // Resolve all image fields that are blob URLs
      const originals: Record<string, string> = {
        heroImage: content.heroImage,
        feature1Image: content.feature1Image,
        feature2Image: content.feature2Image,
        feature3Image: content.feature3Image,
      };

      const resolved = { ...values };
      const toDelete: string[] = [];

      for (const field of IMAGE_FIELDS) {
        const { url, oldUrl } = await resolveImageField(
          values[field],
          originals[field],
        );
        resolved[field] = url;
        if (oldUrl) toDelete.push(oldUrl);
      }

      const result = await updateStartPageContent(resolved);

      if (result.success) {
        // Best-effort cleanup of replaced S3 images
        await Promise.all(toDelete.map(removeOldImage));
        toast.success(result.msg);
        router.refresh();
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Hero</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="heroImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bakgrundsbild</FormLabel>
                  <FormControl>
                    <ImageInput
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      defaultValue={IMAGE_DEFAULTS.heroImage}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="heroLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Etikett (liten text ovan rubriken)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Välkommen till Motion Zone"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="heroTitleLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rubrik – del 1 (plain)</FormLabel>
                    <FormControl>
                      <Input placeholder="Dans är" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="heroTitleAccent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rubrik – accent (kursiv färgad)</FormLabel>
                    <FormControl>
                      <Input placeholder="Passion" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="heroTitleLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rubrik – del 2 (rad 2)</FormLabel>
                    <FormControl>
                      <Input placeholder="Och Livet i Rörelse" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormDescription>
              Rubriken visas som:{" "}
              <em>
                {form.watch("heroTitleLine1")}{" "}
                <span className="italic text-brand">
                  {form.watch("heroTitleAccent")}
                </span>{" "}
                / {form.watch("heroTitleLine2")}
              </em>
            </FormDescription>

            <FormField
              control={form.control}
              name="heroSubtext"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brödtext</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ── Features ──────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Features-sektion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="featuresTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sektionens titel</FormLabel>
                    <FormControl>
                      <Input placeholder="Varför Motion Zone?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="featuresSubtext"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sektionens underrubrik</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Feature cards – horizontal grid on wider screens */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(
                [
                  { n: 1, label: "Kort 1" },
                  { n: 2, label: "Kort 2" },
                  { n: 3, label: "Kort 3" },
                ] as const
              ).map(({ n, label }) => (
                <Card key={n} className="border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name={`feature${n}Image`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bild</FormLabel>
                          <FormControl>
                            <ImageInput
                              compact
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              defaultValue={IMAGE_DEFAULTS[`feature${n}Image`]}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`feature${n}Title`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Titel</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`feature${n}Description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Beskrivning</FormLabel>
                          <FormControl>
                            <Textarea rows={2} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? <Loader /> : <Save className="h-4 w-4" />}
          {isPending ? "Sparar..." : "Spara startsidan"}
        </Button>
      </form>
    </Form>
  );
}
