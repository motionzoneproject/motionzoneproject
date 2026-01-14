"use client";

/// JAG HÅLLER PÅ MED DETTA FORMULÄR SNART KLAR. fix.

import { zodResolver } from "@hookform/resolvers/zod";
import { DialogDescription } from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
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
import { editProduct } from "@/lib/actions/admin";
import { adminAddProductSchema } from "@/validations/adminforms";

const formSchema = adminAddProductSchema;

type CourseFormInput = z.input<typeof formSchema>;
type CourseFormOutput = z.output<typeof formSchema>;

interface Props {
  productId: string;
  clipcard: boolean;
  description: string;
  imageURL: string;
  name: string;
  price: number;
  clipCount: number;
  maxCustomers: number;
  unlimitedCustomers: boolean;
}

export default function EditProductForm({
  productId,
  clipCount,
  clipcard,
  description,
  name,
  price,
  imageURL,
  maxCustomers,
  unlimitedCustomers,
}: Props) {
  const form = useForm<CourseFormInput, unknown, CourseFormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clipcard: clipcard,
      // courses: [], // Ifall vi ska ha ett och samma formulär sen.
      imageURL: imageURL,
      description: description,
      name: name,
      price: price,
      clipCount: clipCount,
      maxCustomers: maxCustomers,
      unlimitedCustomers: unlimitedCustomers,
    },
  });

  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    let finalImageUrl = values.imageURL;
    let newImg: boolean = false;

    if (values.imageURL.startsWith("blob:")) {
      const res = await fetch(values.imageURL);

      const blob = await res.blob(); // Få bilden som den blob det är.
      const formData = new FormData();
      formData.append("file", blob, "image.jpg");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (uploadRes.ok) {
        const data = await uploadRes.json();
        finalImageUrl = data.url;
        newImg = true;

        URL.revokeObjectURL(values.imageURL);
      } else {
        toast.error("Uppladdning misslyckades");
        return;
      }
    }

    const validatedValues = await formSchema.parseAsync({
      ...values,
      imageURL: finalImageUrl,
    });

    const res = await editProduct(productId, validatedValues, newImg);
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
        <Button variant={"secondary"} className="cursor-pointer">
          Ändra produkt
        </Button>
      </DialogTrigger>

      <DialogContent className="overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Ändra produkt</DialogTitle>
          <DialogDescription>
            Kurser läggs in efter att produkten har skapats.
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-2 p-2 rounded-xl max-w-full"
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

                <FormField
                  control={form.control}
                  name="maxCustomers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max antal köp</FormLabel>

                      <FormControl>
                        <Input
                          disabled={form.watch("unlimitedCustomers") === true}
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
                  Ändra
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
