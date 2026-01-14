"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PackagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
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
import { createCourseProduct } from "@/lib/actions/admin";
import { adminCreateCourseProductSchema } from "@/validations/adminforms";

type FormInput = z.input<typeof adminCreateCourseProductSchema>;
type FormOutput = z.output<typeof adminCreateCourseProductSchema>;

interface Props {
  courseId: string;
  courseName: string;
}

export default function CreateCourseProductForm({
  courseId,
  courseName,
}: Props) {
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(adminCreateCourseProductSchema),
    defaultValues: {
      courseId,
      productName: courseName,
      price: 0,
      unlimitedCustomers: false,
      maxCustomers: 1,
      unlimitedLessons: false,
      lessonsIncluded: 1,
    },
  });

  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      form.reset({
        courseId,
        productName: courseName,
        price: 0,
        unlimitedCustomers: true,
        maxCustomers: 0,
        unlimitedLessons: true,
        lessonsIncluded: 0,
      });
    }
  }, [courseId, form, isOpen, courseName]);

  async function onSubmit(
    values: z.infer<typeof adminCreateCourseProductSchema>,
  ) {
    const res = await createCourseProduct(values);
    if (res.success) {
      toast.success(res.msg);
      setIsOpen(false);
      router.refresh();
    } else {
      toast.error(res.msg);
    }
  }

  const hasUnlimitedCustomers = form.watch("unlimitedCustomers") === true;
  const hasUnlimitedLessons = form.watch("unlimitedLessons") === true;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="gap-2">
          <PackagePlus className="h-4 w-4" />
          Skapa kurs-produkt
        </Button>
      </DialogTrigger>

      <DialogContent className="overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Skapa kurs-produkt för {courseName}</DialogTitle>
        </DialogHeader>

        <Card>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-3 p-2 rounded-xl"
              >
                <FormField
                  control={form.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormLabel></FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Produktnamn</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                            } else if (
                              Number(form.getValues("maxCustomers")) < 1
                            ) {
                              form.setValue("maxCustomers", 1);
                            }
                          }}
                          className="w-6 h-6"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!hasUnlimitedCustomers && (
                  <FormField
                    control={form.control}
                    name="maxCustomers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max antal köp (minst 1)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
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
                  name="unlimitedLessons"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Obegränsat antal tillfällen</FormLabel>
                      <FormControl>
                        <Checkbox
                          checked={field.value as boolean}
                          onCheckedChange={(checked: boolean) => {
                            field.onChange(checked);
                            if (checked) {
                              form.setValue("lessonsIncluded", 0);
                            } else if (
                              Number(form.getValues("lessonsIncluded")) < 1
                            ) {
                              form.setValue("lessonsIncluded", 1);
                            }
                          }}
                          className="w-6 h-6"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!hasUnlimitedLessons && (
                  <FormField
                    control={form.control}
                    name="lessonsIncluded"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Antal tillfällen (minst 1)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
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

                <Button type="submit" variant="secondary" className="w-full">
                  Skapa produkt
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
