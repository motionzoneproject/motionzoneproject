"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
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
  DialogDescription,
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
import type { Termin } from "@/generated/prisma/client";
import { checkTerminDateChange, editTermin } from "@/lib/actions/admin";
import { adminAddTerminSchema } from "@/validations/adminforms";

const formSchema = adminAddTerminSchema;

type FormInput = z.input<typeof adminAddTerminSchema>;
type FormOutput = z.output<typeof adminAddTerminSchema>;

interface Props {
  termin: Termin;
}

export default function EditTerminForm({ termin }: Props) {
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: termin.name,
      startDate: termin.startDate,
      endDate: termin.endDate,
    },
  });

  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const check = await checkTerminDateChange(
      termin.id,
      values.startDate,
      values.endDate,
    );

    if (check.count > 0) {
      const confirm = window.confirm(
        `Varning: ${check.count} bokningar ligger utanför de nya datumen. ` +
          `Dessa kommer raderas och eleverna får tillbaka sina klipp. Vill du fortsätta?`,
      );
      if (!confirm) return;
    }

    // 2. Kör den vanliga editTermin om man godkänt

    const res = await editTermin(termin.id, values);
    if (res.success) {
      toast.success(res.msg);
      setIsOpen(false);
      router.refresh();
    } else {
      toast.error(res.msg);
    }
  }

  const formatDateToInput = (date: unknown) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={(e) => setIsOpen(e)}>
      <DialogTrigger asChild>
        <Button variant={"default"} className="cursor-pointer">
          Ändra termin
        </Button>
      </DialogTrigger>

      <DialogContent className="overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Ändra terminen</DialogTitle>
          <DialogDescription>
            Ange terminens namn och vilka datum terminen har.
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
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start datum</FormLabel>

                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={formatDateToInput(field.value)}
                          onChange={field.onChange}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slut datum</FormLabel>

                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={formatDateToInput(field.value)}
                          onChange={field.onChange}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  Skapa
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
