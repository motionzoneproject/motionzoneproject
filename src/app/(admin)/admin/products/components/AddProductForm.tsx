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
import { Textarea } from "@/components/ui/textarea";
import { addNewProduct } from "@/lib/actions/admin";
import { uploadImageFromBlob } from "@/lib/uploads";
import { adminProductSchema } from "@/validations/adminforms";

const formSchema = adminProductSchema;

type CourseFormInput = z.input<typeof formSchema>;
type CourseFormOutput = z.output<typeof formSchema>;

export default function AddProductForm({
  initialLang = "sv",
}: {
  initialLang?: "sv" | "en";
}) {
  const form = useForm<CourseFormInput, unknown, CourseFormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clipcard: false,
      description: "",
      description2: "",
      imageURL: "",
      name: "",
      name2: "",
      price: 0,
      clipCount: 0,
      unlimitedCustomers: true,
      maxCustomers: 1,
    },
  });

  const [formLang, setFormLang] = useState(initialLang);

  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const isBusy = form.formState.isSubmitting || form.formState.isValidating;

  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen, form]);

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

    const payload = await formSchema.parseAsync({
      ...values,
      imageURL: finalImageURL,
      maxCustomers: values.unlimitedCustomers ? 0 : values.maxCustomers,
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
            <div className="p2 text-sm my-2">
              Formulärspråk:{" "}
              <LanguageSwitcherInput
                value={formLang ?? "sv"}
                setValue={(e) => setFormLang(e === "en" ? "en" : "sv")}
              />
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
                    <FormItem
                      className={`${formLang === "sv" ? "" : "hidden"}`}
                    >
                      <FormLabel>Namn ({formLang})</FormLabel>
                      <FormControl>
                        <Input placeholder="Namnge produkten" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name2"
                  render={({ field }) => (
                    <FormItem
                      className={`${formLang === "sv" ? "hidden" : ""}`}
                    >
                      <FormLabel>Namn ({formLang})</FormLabel>
                      <FormControl>
                        <Input placeholder="Namnge produkten" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem
                      className={`${formLang === "sv" ? "" : "hidden"}`}
                    >
                      <FormLabel>Beskrivning ({formLang})</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Beskriv produkten..."
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
                  name="description2"
                  render={({ field }) => (
                    <FormItem
                      className={`${formLang === "sv" ? "hidden" : ""}`}
                    >
                      <FormLabel>Beskrivning ({formLang})</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Beskriv produkten..."
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
                    <FormItem>
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
                          min="0"
                          step="1"
                          {...field}
                          value={
                            form.watch("clipcard") === false
                              ? 0
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
