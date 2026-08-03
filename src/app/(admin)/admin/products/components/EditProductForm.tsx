"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DialogDescription } from "@radix-ui/react-dialog";
import { Pencil, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import ImageInput from "@/components/ImageInput";
import LanguageSwitcherInput from "@/components/LanguageSwitcherInput";
import Loader from "@/components/Loader";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from "@/generated/prisma/client";
import { editProduct } from "@/lib/actions/admin";
import { getProductStats } from "@/lib/actions/purchase-actions";
import { oreToSek } from "@/lib/money";
import { uploadImageFromBlob } from "@/lib/uploads";
import { adminProductSchema } from "@/validations/adminforms";

const formSchema = adminProductSchema;

type EditProductFormInput = z.input<typeof formSchema>;
type EditProductFormOutput = z.output<typeof formSchema>;

interface Props {
  productId: string;
  clipcard: boolean;
  unlimitedCustomers: boolean;
  description: string;
  description_en: string;
  name: string;
  name_en: string;
  price: number;
  clipCount: number;
  maxCustomers: number;
  imageURL: string;
  initialLang?: "sv" | "en";
  categories: Category[];
  categoryId?: string;
  autobook: boolean;
  maxCourses: number | null;
}

export default function EditProductForm({
  productId,
  clipCount,
  clipcard,
  unlimitedCustomers,
  description,
  name,
  description_en,
  name_en,
  price,
  imageURL,
  maxCustomers,
  initialLang = "sv",
  categories,
  categoryId,
  autobook,
  maxCourses,
}: Props) {
  const id = useId();
  const form = useForm<EditProductFormInput, unknown, EditProductFormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clipcard: clipcard,
      unlimitedCustomers: unlimitedCustomers,
      // courses: [], // Ifall vi ska ha ett och samma formulär sen.
      description: description,
      name: name,
      description_en: description_en ?? "",
      name_en: name_en ?? "",
      price: oreToSek(price),
      clipCount: clipCount,
      maxCustomers: maxCustomers,
      categoryId: categoryId || undefined,
      imageURL: imageURL,
      autobook: autobook,
      maxCourses: maxCourses,
    },
  });

  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const isBusy = form.formState.isSubmitting || form.formState.isValidating;

  // Reset för att gammal data annars visas.
  useEffect(() => {
    if (!isOpen) return;

    form.reset({
      clipcard,
      unlimitedCustomers,
      description,
      name,
      description_en,
      name_en,
      price: oreToSek(price),
      clipCount,
      categoryId,
      maxCustomers,
      imageURL,
      autobook,
      maxCourses,
    });
  }, [
    isOpen,
    form,
    clipcard,
    categoryId,
    unlimitedCustomers,
    description,
    name,
    description_en,
    name_en,
    price,
    clipCount,
    maxCustomers,
    imageURL,
    autobook,
    maxCourses,
  ]);

  const [formLang, setFormLang] = useState(initialLang);
  const errors = form.formState.errors;

  useEffect(() => {
    if (!isOpen) {
      setFormLang(initialLang);
    }
  }, [initialLang, isOpen]);

  useEffect(() => {
    if (errors.name || errors.description) {
      setFormLang("sv");
    } else if (errors.name_en || errors.description_en) {
      setFormLang("en");
    }
  }, [errors]);

  const watchedClipcard = form.watch("clipcard");

  // Klippkort och autobokning är ömsesidigt uteslutande.
  // maxCourses ska INTE nollställas här - ett klippkort kan ha maxCourses.
  useEffect(() => {
    if (watchedClipcard) {
      form.setValue("autobook", false);
    }
  }, [watchedClipcard, form.setValue]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const oldImageUrl = imageURL;

    let finalImageURL = values.imageURL ?? "";

    if (finalImageURL.startsWith("blob:")) {
      try {
        const res = await fetch(finalImageURL);
        const blob = await res.blob();
        finalImageURL = await uploadImageFromBlob(blob);
        URL.revokeObjectURL(values.imageURL ?? "");
      } catch (e) {
        console.error(e);
        toast.error("Uppladdning misslyckades.");
        return;
      }
    }

    const stats = await getProductStats(productId);

    const normalizedMaxCourses =
      typeof values.maxCourses === "number" &&
      Number.isFinite(values.maxCourses) &&
      values.maxCourses >= 1
        ? Math.trunc(values.maxCourses)
        : null;

    const payload = await formSchema.parseAsync({
      ...values,
      imageURL: finalImageURL,
      maxCustomers: values.unlimitedCustomers ? 0 : values.maxCustomers,
      maxCourses: normalizedMaxCourses,
    });

    if (!payload.unlimitedCustomers) {
      if (!stats.success || stats.sold === null || stats.reserved === null) {
        toast.error("Kunde inte verifiera platsstatistik. Försök igen.");
        return;
      }

      const usedSpots = stats.sold + stats.reserved;
      if (payload.maxCustomers < usedSpots) {
        toast.error(
          `Kan inte sätta max under redan upptagna platser (${usedSpots}).`,
        );
        return;
      }
    }

    const res = await editProduct(productId, payload);

    if (res.success) {
      if (!!oldImageUrl && finalImageURL !== oldImageUrl) {
        // Ta bort gamla
        try {
          const res = await fetch("/api/remove", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: oldImageUrl }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || "Remove failed");
          toast("Gammal bild borttagen");
        } catch (err) {
          toast(String(err));
        }
      }

      toast.success(res.msg);
      setIsOpen(false);
      router.refresh();
    } else {
      toast.error(res.msg);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(e) => setIsOpen(e)}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Ändra produkt</span>
        </Button>
      </DialogTrigger>

      <DialogContent id={id} className="max-h-[90dvh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Ändra produkt</DialogTitle>
          <DialogDescription>
            Kurser läggs in efter att produkten har skapats.
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardContent>
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
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-2 p-2 rounded-xl"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className={formLang === "en" ? "hidden" : ""}>
                      <FormLabel>Namn (sv)</FormLabel>
                      <FormControl>
                        <Input placeholder="Namnge produkten" {...field} />
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
                        <Input placeholder="Name the product" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Ingen kategori" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Ingen kategori</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                          placeholder="Skriv produktbeskrivning..."
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
                          placeholder="Write product description..."
                        />
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
                      <FormLabel>Bild</FormLabel>

                      <FormControl>
                        <ImageInput {...field} />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pris</FormLabel>

                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          {...field}
                          value={
                            field.value === undefined ? "" : String(field.value)
                          }
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unlimitedCustomers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Obegränsat antal kunder</FormLabel>

                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={(checked) =>
                            field.onChange(checked === true)
                          }
                          className="w-6 h-6"
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxCustomers"
                  render={({ field }) => (
                    <FormItem
                      className={
                        form.watch("unlimitedCustomers") === true
                          ? "hidden"
                          : ""
                      }
                    >
                      <FormLabel>Max antal kunder:</FormLabel>

                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          disabled={form.watch("unlimitedCustomers") === true}
                          {...field}
                          value={
                            form.watch("unlimitedCustomers") === true
                              ? ""
                              : field.value === undefined
                                ? ""
                                : String(field.value)
                          }
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clipcard"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Klippkort</FormLabel>

                      <FormControl>
                        <Checkbox
                          checked={field.value as boolean}
                          onCheckedChange={(checked: boolean) =>
                            field.onChange(checked)
                          }
                          className="w-6 h-6"
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clipCount"
                  render={({ field }) => (
                    <FormItem
                      className={
                        form.watch("clipcard") === false ? "hidden" : ""
                      }
                    >
                      <FormLabel>Antal tillfällen (totalt):</FormLabel>

                      <FormControl>
                        <Input
                          disabled={form.watch("clipcard") === false}
                          type="number"
                          min="1"
                          step="1"
                          {...field}
                          value={
                            form.watch("clipcard") === false
                              ? 0
                              : field.value === undefined
                                ? ""
                                : String(field.value)
                          }
                          onChange={(e) => {
                            const parsed = Number(e.target.value);
                            field.onChange(Number.isNaN(parsed) ? 1 : parsed);
                          }}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="autobook"
                  render={({ field }) => (
                    <FormItem
                      className={form.watch("clipcard") ? "hidden" : ""}
                    >
                      <FormLabel>Autobokning</FormLabel>
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={(checked) =>
                            field.onChange(
                              checked === true && !form.watch("clipcard"),
                            )
                          }
                          className="w-6 h-6"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxCourses"
                  render={({ field }) => {
                    const limitEnabled =
                      field.value !== null && field.value !== undefined;

                    return (
                      <FormItem>
                        <FormLabel>Begränsa antal valbara kurser</FormLabel>

                        <div className="flex items-center gap-2 mb-2">
                          <Checkbox
                            checked={limitEnabled}
                            onCheckedChange={(checked) => {
                              if (checked === true) {
                                field.onChange(1);
                              } else {
                                field.onChange(null);
                              }
                            }}
                            className="w-6 h-6"
                          />
                          <span className="text-sm">Begränsa till:</span>
                        </div>

                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            disabled={!limitEnabled}
                            value={limitEnabled ? String(field.value) : ""}
                            onChange={(e) => {
                              const parsed = Number(e.target.value);
                              field.onChange(Number.isNaN(parsed) ? 1 : parsed);
                            }}
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {isBusy ? (
                  <Loader />
                ) : (
                  <Button variant="ghost" type="submit" className="w-full">
                    <Save className="h-4 w-4" />
                    Spara
                  </Button>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              <X className="h-4 w-4" />
              Avbryt
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
