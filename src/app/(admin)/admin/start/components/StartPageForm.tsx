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
  lang: "sv" | "en";
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
  current: string | undefined,
  original: string | null | undefined,
): Promise<{ url: string; oldUrl: string | null }> {
  const currentValue = current ?? "";
  const originalValue = original ?? "";

  // Fall 1: användaren valde en ny fil — ladda upp blob och ersätt
  if (currentValue.startsWith("blob:")) {
    const res = await fetch(currentValue);
    const blob = await res.blob();
    const uploaded = await uploadImageFromBlob(blob);
    URL.revokeObjectURL(currentValue);
    const oldUrl =
      originalValue &&
      originalValue !== uploaded &&
      originalValue.startsWith("http")
        ? originalValue
        : null;
    return { url: uploaded, oldUrl };
  }

  // Fall 2: användaren rensade bilden (eller inget valt) — ta bort gammal S3-bild om den fanns
  const oldUrl =
    originalValue &&
    originalValue !== currentValue &&
    originalValue.startsWith("http")
      ? originalValue
      : null;
  return { url: currentValue, oldUrl };
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

export function StartPageForm({ content, lang }: StartPageFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(adminStartPageSchema),
    defaultValues: {
      heroImage: content.heroImage,
      heroLabel: content.heroLabel ?? "",
      heroLabel_en: content.heroLabel_en ?? "",
      heroTitleLine1: content.heroTitleLine1 ?? "",
      heroTitleLine1_en: content.heroTitleLine1_en ?? "",
      heroTitleAccent: content.heroTitleAccent ?? "",
      heroTitleAccent_en: content.heroTitleAccent_en ?? "",
      heroTitleLine2: content.heroTitleLine2 ?? "",
      heroTitleLine2_en: content.heroTitleLine2_en ?? "",
      heroSubtext: content.heroSubtext ?? "",
      heroSubtext_en: content.heroSubtext_en ?? "",
      featuresTitle: content.featuresTitle ?? "",
      featuresTitle_en: content.featuresTitle_en ?? "",
      featuresSubtext: content.featuresSubtext ?? "",
      featuresSubtext_en: content.featuresSubtext_en ?? "",
      feature1Image: content.feature1Image,
      feature1Title: content.feature1Title ?? "",
      feature1Title_en: content.feature1Title_en ?? "",
      feature1Description: content.feature1Description ?? "",
      feature1Description_en: content.feature1Description_en ?? "",
      feature2Image: content.feature2Image,
      feature2Title: content.feature2Title ?? "",
      feature2Title_en: content.feature2Title_en ?? "",
      feature2Description: content.feature2Description ?? "",
      feature2Description_en: content.feature2Description_en ?? "",
      feature3Image: content.feature3Image,
      feature3Title: content.feature3Title ?? "",
      feature3Title_en: content.feature3Title_en ?? "",
      feature3Description: content.feature3Description ?? "",
      feature3Description_en: content.feature3Description_en ?? "",
      image1: content.image1 ?? "",
      image2: content.image2 ?? "",
      image3: content.image3 ?? "",
    },
  });

  const OPTIONAL_IMAGE_FIELDS = ["image1", "image2", "image3"] as const;

  async function onSubmit(values: FormValues) {
    setIsPending(true);
    try {
      const originals: Record<string, string | null | undefined> = {
        heroImage: content.heroImage,
        feature1Image: content.feature1Image,
        feature2Image: content.feature2Image,
        feature3Image: content.feature3Image,
        image1: content.image1,
        image2: content.image2,
        image3: content.image3,
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

      for (const field of OPTIONAL_IMAGE_FIELDS) {
        const { url, oldUrl } = await resolveImageField(
          values[field],
          originals[field],
        );
        resolved[field] = url || undefined;
        if (oldUrl) toDelete.push(oldUrl);
      }

      const result = await updateStartPageContent(resolved);

      if (result.success) {
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
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column – background image preview */}

              {/* do this so i get some space */}

              <FormField
                control={form.control}
                name="heroImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bakgrundsbild</FormLabel>
                    <FormControl>
                      <ImageInput
                        previewClassName="h-48 w-full object-cover object-top rounded"
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

              {/* Right column – all text fields */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name={lang === "en" ? "heroLabel_en" : "heroLabel"}
                  key={`heroLabel-${lang}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Etikett (liten text ovan rubriken) ({lang}){" "}
                      </FormLabel>
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

                {/*  */}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/*  */}

                  <FormField
                    control={form.control}
                    name={
                      lang === "en" ? "heroTitleLine1_en" : "heroTitleLine1"
                    }
                    key={`heroTitleLine1-${lang}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rubrik – del 1 ({lang})</FormLabel>
                        <FormControl>
                          <Input placeholder="Dans är" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/*  */}

                  <FormField
                    control={form.control}
                    name={
                      lang === "en" ? "heroTitleAccent_en" : "heroTitleAccent"
                    }
                    key={`heroTitleAccent-${lang}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rubrik – accent ({lang})</FormLabel>
                        <FormControl>
                          <Input placeholder="Passion" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/*  */}

                  <FormField
                    control={form.control}
                    name={
                      lang === "en" ? "heroTitleLine2_en" : "heroTitleLine2"
                    }
                    key={`heroTitleLine2-${lang}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rubrik – del 2 ({lang})</FormLabel>
                        <FormControl>
                          <Input placeholder="Och Livet i Rörelse" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/*  */}

                <FormDescription>
                  Visas som:{" "}
                  <em>
                    {form.watch("heroTitleLine1")}{" "}
                    <span className="italic text-brand">
                      {form.watch("heroTitleAccent")}
                    </span>{" "}
                    / {form.watch("heroTitleLine2")}
                  </em>
                </FormDescription>

                {/*  */}

                <FormField
                  control={form.control}
                  name={lang === "en" ? "heroSubtext_en" : "heroSubtext"}
                  key={`heroSubtext-${lang}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brödtext ({lang})</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/*  */}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Bildsektion ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Bildsektion</CardTitle>
            <FormDescription>
              Visas som en egen sektion på startsidan, en bild per rad. Valfritt
              att fylla i — lämna tomt om du inte vill visa någon bild där.
            </FormDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["image1", "image2", "image3"] as const).map(
                (fieldName, index) => (
                  <FormField
                    key={fieldName}
                    control={form.control}
                    name={fieldName}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bild {index + 1}</FormLabel>
                        <FormControl>
                          <ImageInput
                            previewClassName="h-48 w-full object-cover rounded"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            defaultValue=""
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ),
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Features ──────────────────────────────────────────────────── */}

        <Card>
          <CardHeader>
            <CardTitle>Features-sektion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/*  */}

              <FormField
                control={form.control}
                name={lang === "en" ? "featuresTitle_en" : "featuresTitle"}
                key={`featuresTitle-${lang}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sektionens titel ({lang})</FormLabel>
                    <FormControl>
                      <Input placeholder="Varför Motion Zone?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/*  */}

              <FormField
                control={form.control}
                name={lang === "en" ? "featuresSubtext_en" : "featuresSubtext"}
                key={`featuresSubtext-${lang}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sektionens underrubrik ({lang})</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/*  */}
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
                <Card key={n}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/*  */}

                    <FormField
                      control={form.control}
                      name={`feature${n}Image`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bild</FormLabel>
                          <FormControl>
                            <ImageInput
                              previewClassName="h-60 w-full object-cover"
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

                    {/*  */}

                    <FormField
                      control={form.control}
                      name={`feature${n}Title`}
                      render={({ field }) => (
                        <FormItem
                          className={`${lang === "sv" ? "" : "hidden"}`}
                        >
                          <FormLabel>Titel ({lang})</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`feature${n}Title_en`}
                      render={({ field }) => (
                        <FormItem
                          className={`${lang === "sv" ? "hidden" : ""}`}
                        >
                          <FormLabel>Titel ({lang})</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/*  */}

                    <FormField
                      control={form.control}
                      name={`feature${n}Description`}
                      render={({ field }) => (
                        <FormItem
                          className={`${lang === "sv" ? "" : "hidden"}`}
                        >
                          <FormLabel>Beskrivning ({lang})</FormLabel>
                          <FormControl>
                            <Textarea rows={2} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`feature${n}Description_en`}
                      render={({ field }) => (
                        <FormItem
                          className={`${lang === "sv" ? "hidden" : ""}`}
                        >
                          <FormLabel>Beskrivning ({lang})</FormLabel>
                          <FormControl>
                            <Textarea rows={2} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/*  */}
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
