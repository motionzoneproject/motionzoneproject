"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DialogDescription } from "@radix-ui/react-dialog";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import ImageInput from "@/components/ImageInput";
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
import { adminAddProductSchema } from "@/validations/adminforms";

const formSchema = adminAddProductSchema;

type CourseFormInput = z.input<typeof formSchema>;
type CourseFormOutput = z.output<typeof formSchema>;

export default function AddProductForm() {
  const form = useForm<CourseFormInput, unknown, CourseFormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clipcard: false,
      description: "",
      imageURL: "",
      name: "",
      price: 0,
      clipCount: 0,
      maxCustomers: 0,
      unlimitedCustomers: false,
    },
  });

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen, form]);

  // Ladda upp bild och lägg in produkt.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Vi byter ut imageURL i values oavsett, bara för att göra det lite enkelt för oss.
    let finalImageURL = values.imageURL;

    if (values.imageURL.startsWith("blob:")) {
      try {
        const res = await fetch(values.imageURL);

        const blob = await res.blob();
        const formData = new FormData();
        formData.append("file", blob, "image.jpg");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const data = await uploadRes.json();
          finalImageURL = data.url;

          URL.revokeObjectURL(values.imageURL);
        } else {
          toast.error(`Uppladdning misslyckades. ${uploadRes.statusText}`);
          return;
        }
      } catch (e) {
        console.error(e);
        toast.error(`Uppladdning misslyckades. ${JSON.stringify(e)}`);
        return;
      }
    }

    const validatedValues = await formSchema.parseAsync({
      ...values,
      imageURL: finalImageURL,
    });

    const res = await addNewProduct(validatedValues);
    if (res.success) {
      toast.success(res.msg);
      setIsOpen(false);
      if (res.productId) {
        const params = new URLSearchParams(searchParams);
        params.set("openCoursesFor", res.productId);
        router.push(`${pathname}?${params.toString()}`);
      }
    } else {
      toast.error(res.msg);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(e) => setIsOpen(e)}>
      <DialogTrigger asChild>
        <Button variant={"secondary"} className="cursor-pointer">
          Ny produkt
        </Button>
      </DialogTrigger>

      <DialogContent className="overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Skapa en ny produkt</DialogTitle>
          <DialogDescription>
            Kurser läggs in efter att produkten har skapats.
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-2 p-2 rounded-xl"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Namn</FormLabel>
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
                      <FormLabel>Beskrivning av produkten</FormLabel>

                      <FormControl>
                        <Textarea {...field} />
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
                          step="0.01"
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
                      <FormLabel>Obegränsat antal köp</FormLabel>

                      <FormControl>
                        <Checkbox
                          checked={field.value as boolean}
                          onCheckedChange={(checked: boolean) => {
                            field.onChange(checked);
                            if (checked) {
                              form.setValue("maxCustomers", 0);
                            }
                          }}
                          className="w-6 h-6"
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("unlimitedCustomers") !== true && (
                  <FormField
                    control={form.control}
                    name="maxCustomers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max antal köp</FormLabel>

                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            {...field}
                            value={
                              field.value === undefined
                                ? ""
                                : String(field.value)
                            }
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="clipcard"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Klippkort</FormLabel>

                      <FormControl>
                        <Checkbox
                          checked={field.value as boolean}
                          onCheckedChange={(checked: boolean) => {
                            field.onChange(checked);
                            const currentClipCount = Number(
                              form.getValues("clipCount") ?? 0,
                            );
                            if (checked && currentClipCount < 1) {
                              form.setValue("clipCount", 1);
                            }
                          }}
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
                    <FormItem>
                      <FormLabel>Antal klipp</FormLabel>

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
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" variant={"secondary"} className="w-full">
                  Skapa
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Avbryt
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
