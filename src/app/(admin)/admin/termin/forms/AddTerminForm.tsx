"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import LanguageSwitcherInput from "@/components/LanguageSwitcherInput";
import Loader from "@/components/Loader";
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
import { addNewTermin } from "@/lib/actions/admin";
import { formatDateToInput } from "@/lib/date-utils";
import { adminAddTerminSchema } from "@/validations/adminforms";

const formSchema = adminAddTerminSchema;

type FormInput = z.input<typeof adminAddTerminSchema>;
type FormOutput = z.output<typeof adminAddTerminSchema>;

export default function AddTerminForm({
  initialLang = "sv",
}: {
  initialLang?: "sv" | "en";
}) {
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      name_en: "",
      startDate: "",
      endDate: "",
    },
  });
  const [formLang, setFormLang] = useState(initialLang);

  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // (parameter) values: {
    //     name: string;
    //     startDate: Date;
    //     endDate: Date;
    // }
    const res = await addNewTermin(values);
    if (res.success) {
      toast.success(res.msg);
      setIsOpen(false);
      router.refresh();
    } else {
      toast.error(res.msg);
    }
  }

  const isBusy = form.formState.isSubmitting || form.formState.isValidating;

  return (
    <Dialog open={isOpen} onOpenChange={(e) => setIsOpen(e)}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="cursor-pointer">
          <PlusIcon /> Ny termin
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Skapa en ny termin</DialogTitle>
          <DialogDescription>
            Ange terminens namn och vilka datum terminen har.
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
                  name={formLang === "en" ? "name_en" : "name"}
                  key={`name-${formLang}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Namn ({formLang})</FormLabel>
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

                <Button
                  type="submit"
                  variant="ghost"
                  className="w-full"
                  disabled={isBusy}
                >
                  <PlusIcon className="h-4 w-4" />
                  Skapa
                </Button>
                {isBusy && <Loader />}
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
