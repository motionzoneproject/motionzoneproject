"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EditIcon, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import LanguageSwitcherInput from "@/components/LanguageSwitcherInput";
import Loader from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import type { Lesson } from "@/generated/prisma/client";
import { editLessonItem } from "@/lib/actions/admin";
import { adminLessonFormSchema } from "@/validations/adminforms";

const formSchema = adminLessonFormSchema;
type FormInput = z.input<typeof adminLessonFormSchema>;
type FormOutput = z.output<typeof adminLessonFormSchema>;

export function EditLessonBtn({ lesson }: { lesson: Lesson }) {
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cancelled: lesson.cancelled,
      id: lesson.id,
      message: lesson.message ?? "",
      message_en: lesson.message_en ?? "",
    },
  });

  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    form.reset({
      cancelled: lesson.cancelled,
      id: lesson.id,
      message: lesson.message ?? "",
      message_en: lesson.message_en ?? "",
    });
  }, [
    isOpen,
    form,
    lesson.cancelled,
    lesson.id,
    lesson.message,
    lesson.message_en,
  ]);

  const isBusy = form.formState.isSubmitting || form.formState.isValidating;

  async function onSubmit(values: FormInput) {
    const valuesOutput = await formSchema.parseAsync(values);

    const res = await editLessonItem(valuesOutput);

    if (res.success) {
      toast.success(res.msg);
      setIsOpen(false);
      router.refresh();
    } else {
      toast.error(res.msg);
    }
  }

  const [formLang, setFormLang] = useState<string>("sv");

  return (
    <Dialog open={isOpen} onOpenChange={(e) => setIsOpen(e)}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="cursor-pointer">
          <EditIcon />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Hantera lektion</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>

        <div className="p2 text-sm">
          Formulärspråk:{" "}
          <LanguageSwitcherInput
            value={formLang ?? "sv"}
            setValue={(e) => setFormLang(e)}
          />
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-2 p-2 rounded-xl"
          >
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem className={`${formLang === "sv" ? "" : "hidden"}`}>
                  <FormLabel>Meddelande ({formLang})</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message_en"
              render={({ field }) => (
                <FormItem className={`${formLang === "sv" ? "hidden" : ""}`}>
                  <FormLabel>Meddelande ({formLang})</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cancelled"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inställd</FormLabel>
                  <FormControl>
                    <Checkbox
                      checked={field.value as boolean}
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
              name="id"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormLabel>id</FormLabel>
                  <FormControl>
                    <Input {...field} type="hidden" />
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
      </DialogContent>
    </Dialog>
  );
}
