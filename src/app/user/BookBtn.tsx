"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { notFound, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addBooking,
  type UserPurchaseWithProduct,
} from "@/lib/actions/server-actions";
import { useSession } from "@/lib/session-provider";
import { UserBookLessonSchema } from "@/validations/userforms";

const formSchema = UserBookLessonSchema;

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

interface Props {
  courseId: string;
  lessonId: string;
  purschaseItems: UserPurchaseWithProduct[];
}

export default function AddTerminForm({
  courseId,
  lessonId,
  purschaseItems,
}: Props) {
  const { user } = useSession();

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      courseId: courseId,
      lessonId: lessonId,
      purchaseId: "",
    },
  });

  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const res = await addBooking(values);
    if (res.success) {
      toast.success(res.msg);
      setIsOpen(false);
      router.refresh();
    } else {
      toast.error(res.msg);
    }
  }

  const _formatDateToInput = (date: unknown) => {
    if (!date) {
      return "";
    }

    if (date instanceof Date) {
      if (Number.isNaN(date.getTime())) {
        return "";
      }
      return date.toISOString().split("T")[0];
    }

    if (typeof date === "string") {
      return date;
    }

    // Fallback: Returnera tomt
    return "";
  };

  if (!user) return notFound();

  return (
    <Dialog open={isOpen} onOpenChange={(e) => setIsOpen(e)}>
      <DialogTrigger asChild>
        <Button variant={"default"} className="bg-green-500 cursor-pointer">
          Ny termin
        </Button>
      </DialogTrigger>

      <DialogContent className="overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Boka lektionen</DialogTitle>
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
                  name="courseId"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormLabel>Kurs id</FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lessonId"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormLabel>lektion id</FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purchaseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Välj kurs:</FormLabel>

                      <FormControl>
                        <Select
                          defaultValue={field.value || ""}
                          onValueChange={async (value) => {
                            field.onChange(
                              value === "none" ? undefined : value,
                            ); // kan ju ha med none ifall vi vill kunna göra så, why not. Dock är detta req så nja.
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Välj kurs" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Välj kurs</SelectLabel>
                              {purschaseItems.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.purchase.product.name} ({c.remainingCount}{" "}
                                  )
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  Boka
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
