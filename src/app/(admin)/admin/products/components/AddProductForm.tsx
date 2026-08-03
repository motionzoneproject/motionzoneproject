"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DialogDescription } from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
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
import { addNewProduct } from "@/lib/actions/admin";
import { uploadImageFromBlob } from "@/lib/uploads";
import { adminProductSchema } from "@/validations/adminforms";

const formSchema = adminProductSchema;

type CourseFormInput = z.input<typeof formSchema>;
type CourseFormOutput = z.output<typeof formSchema>;

export default function AddProductForm({
  initialLang = "sv",
  categories,
}: {
  initialLang?: "sv" | "en";
  categories: Category[];
}) {
  const form = useForm<CourseFormInput, unknown, CourseFormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clipcard: false,
      description: "",
      description_en: "",
      imageURL: "",
      name: "",
      name_en: "",
      price: 0,
      clipCount: 0,
      unlimitedCustomers: true,
      maxCustomers: 1,
      categoryId: "",
      autobook: false,
      maxCourses: null,
    },
  });

  const [formLang, setFormLang] = useState(initialLang);
  const errors = form.formState.errors;

  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const isBusy = form.formState.isSubmitting || form.formState.isValidating;

  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setFormLang(initialLang);
    }
  }, [isOpen, form, initialLang]);

  useEffect(() => {
    if (errors.name || errors.description) {
      setFormLang("sv");
    } else if (errors.name_en || errors.description_en) {
      setFormLang("en");
    }
  }, [errors]);

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

    const res = await addNewProduct(payload);
    if (res.success) {
      toast.success(res.msg);
      setIsOpen(false);
      router.refresh();
    } else {
      toast.error(res.msg);
    }
  }

  const clipcard = form.watch("clipcard");

  useEffect(() => {
    if (clipcard) {
      form.setValue("autobook", false);
    }
  }, [clipcard, form.setValue]);

  return (
    <Dialog open={isOpen} onOpenChange={(e) => setIsOpen(e)}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="cursor-pointer">
          <Plus className="mr-1 h-4 w-4" />
          Ny produkt
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Skapa en ny produkt</DialogTitle>
          <DialogDescription>
            Kurser läggs in i produkten efter att produkten har skapats.
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

                {/**Klippkort */}
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
                      <FormLabel>Antal tillfällen (totalt)</FormLabel>

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
                                field.onChange(null); // Nollställ direkt, inte bara vid submit
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
                    <Plus className="h-4 w-4" />
                    Skapa
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
