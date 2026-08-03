"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { addNewEvent } from "@/lib/actions/admin";
import { formatDateToInputStr } from "@/lib/date-utils";
import { uploadImageFromBlob } from "@/lib/uploads";
import { adminEventSchema } from "@/validations/adminforms";

const formSchema = adminEventSchema;

type FormInput = z.input<typeof adminEventSchema>;
type FormOutput = z.output<typeof adminEventSchema>;

interface Props {
  onSuccess?: () => void;
  initialLang?: string;
}

export default function NewEventForm({ onSuccess, initialLang = "sv" }: Props) {
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      headline: "",
      headline_en: "",
      description: "",
      description_en: "",
      link: "",
      imageURL: "",
      showOnStartpage: false,
      startDate: "",
      endDate: "",
    },
  });

  const router = useRouter();

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
    const res = await addNewEvent({ ...values, imageURL: finalImageURL });
    if (res.success) {
      toast.success(res.msg);
      form.reset();
      onSuccess?.();
      router.refresh();
    } else {
      toast.error(res.msg);
    }
  }

  const isBusy = form.formState.isSubmitting || form.formState.isValidating;

  const [hasEndDate, sethasEndDate] = useState<boolean>(false);

  const [formLang, setFormLang] = useState(initialLang);
  const errors = form.formState.errors;

  useEffect(() => {
    if (errors.headline || errors.description) {
      setFormLang("sv");
    } else if (errors.headline_en || errors.description_en) {
      setFormLang("en");
    }
  }, [errors]);

  return (
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
              name="headline"
              render={({ field }) => (
                <FormItem className={formLang === "en" ? "hidden" : ""}>
                  <FormLabel>Rubrik (sv)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="headline_en"
              render={({ field }) => (
                <FormItem className={formLang === "sv" ? "hidden" : ""}>
                  <FormLabel>Rubrik (en)</FormLabel>
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
                <FormItem className={formLang === "en" ? "hidden" : ""}>
                  <FormLabel>Beskrivning (sv)</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Skriv eventbeskrivning..."
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
                      placeholder="Write event description..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="showOnStartpage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visa på startsidan</FormLabel>
                  <FormControl>
                    <Checkbox
                      checked={field.value === true}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                      className="w-6 h-6"
                    />
                  </FormControl>
                  <FormDescription>
                    Endast markerade och aktuella event visas på startsidan.
                  </FormDescription>
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
                      onChange={(e) => {
                        field.onChange(e);
                        if (!hasEndDate)
                          form.setValue("endDate", e.target.value);
                      }}
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
                  <FormLabel>
                    <Checkbox
                      checked={hasEndDate}
                      onCheckedChange={(e) => {
                        sethasEndDate(!!e);
                        if (!!e === false)
                          form.setValue("endDate", form.watch("startDate"));
                      }}
                      className="w-7 h-7"
                    />{" "}
                    Slutdatum
                  </FormLabel>

                  <FormControl>
                    <Input
                      type="date"
                      className={!hasEndDate ? "hidden" : ""}
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
              name="link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Länk</FormLabel>
                  <FormControl>
                    <Input {...field} />
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

            {isBusy && <Loader />}
            <Button
              type="submit"
              variant="ghost"
              className="w-full"
              disabled={isBusy}
            >
              {isBusy ? "Lägger till..." : "Lägg till event"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
