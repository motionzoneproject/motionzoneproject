"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Termin } from "@/generated/prisma/client";
import {
  checkTerminDateChange,
  editTermin,
} from "@/lib/actions/admin-terminer";
import { formatDateToInputStr } from "@/lib/date-utils";
import { adminAddTerminSchema } from "@/validations/adminforms";

const formSchema = adminAddTerminSchema;

type FormInput = z.input<typeof adminAddTerminSchema>;
type FormOutput = z.output<typeof adminAddTerminSchema>;

interface Props {
  termin: Termin;
  initialLang?: "sv" | "en";
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function EditTerminFormUI({
  termin,
  initialLang = "sv",
  isOpen,
  setIsOpen,
}: Props) {
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: termin.name ?? "",
      name_en: termin.name_en ?? "",
      startDate: termin.startDate ? formatDateToInputStr(termin.startDate) : "",
      endDate: termin.endDate ? formatDateToInputStr(termin.endDate) : "",
    },
  });

  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;

    form.reset({
      name: termin.name,
      name_en: termin.name_en ?? "",
      startDate: termin.startDate ? formatDateToInputStr(termin.startDate) : "",
      endDate: termin.endDate ? formatDateToInputStr(termin.endDate) : "",
    });
  }, [
    isOpen,
    form,
    termin.name,
    termin.startDate,
    termin.endDate,
    termin.name_en,
  ]);

  const [formLang, setFormLang] = useState(initialLang);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // 1. Skapa rena strängjämförelser (YYYY-MM-DD) för att se om admin ändrat något
    const inputStartStr = values.startDate;
    const inputEndStr = values.endDate;

    const dbStartStr = termin.startDate
      ? formatDateToInputStr(termin.startDate)
      : "";
    const dbEndStr = termin.endDate ? formatDateToInputStr(termin.endDate) : "";

    const dateIsChanged =
      inputStartStr !== dbStartStr || inputEndStr !== dbEndStr;

    // 2. Kolla om terminens start och slutdatum har ändrats – skicka strängar till servern!
    const check = dateIsChanged
      ? await checkTerminDateChange(
          termin.id,
          inputStartStr, // ⚡ SÄKERT: Inget mer "new Date()" på klientsidan
          inputEndStr, // ⚡ SÄKERT: Inget mer "new Date()" på klientsidan
        )
      : { count: 0 };

    if (check.count > 0) {
      const confirm = window.confirm(
        `Varning: ${check.count} bokningar ligger utanför de nya datumen. ` +
          `Dese kommer raderas och eleverna får tillbaka sina klipp. Vill du fortsätta?`,
      );
      if (!confirm) return;
    }

    // 3. Kör den vanliga editTermin om man godkänt (eller om datum inte var ändrade)
    const res = await editTermin(termin.id, values, dateIsChanged);

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
                      value={formatDateToInputStr(field.value)}
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
                      value={formatDateToInputStr(field.value)}
                      onChange={field.onChange}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />
            {isBusy && <Loader />}
            <Button
              variant="ghost"
              type="submit"
              className="w-full"
              disabled={isBusy}
            >
              <Save className="h-4 w-4" />
              Spara
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
