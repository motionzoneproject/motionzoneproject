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
import { RichTextEditor } from "@/components/RichTextEditor";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { LegalPage } from "@/generated/prisma/client";
import { updateLegalPage } from "@/lib/actions/legal-actions";
import { adminLegalPageSchema } from "@/validations/adminforms";

type LegalPageFormProps = {
  page: LegalPage;
  onSuccess?: () => void;
  initialLang?: string;
};

export function LegalPageForm({
  page,
  onSuccess,
  initialLang = "sv",
}: LegalPageFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const form = useForm({
    resolver: zodResolver(adminLegalPageSchema),
    defaultValues: {
      slug: page.slug,
      title: page.title,
      title_en: page.title_en ?? "",
      content: page.content,
      content_en: page.content_en ?? "",
    },
  });

  const [formLang, setFormLang] = useState(initialLang);
  const errors = form.formState.errors;

  useEffect(() => {
    if (errors.title || errors.content) {
      setFormLang("sv");
    } else if (errors.title_en || errors.content_en) {
      setFormLang("en");
    }
  }, [errors]);

  async function onSubmit(values: z.infer<typeof adminLegalPageSchema>) {
    setIsPending(true);
    try {
      const result = await updateLegalPage(values);

      if (result.success) {
        toast.success(result.msg);
        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
        }
      } else {
        toast.error(result.msg);
      }
    } catch (error) {
      toast.error("Något gick fel.");
      console.error(error);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div>
      {" "}
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className={formLang === "en" ? "hidden" : ""}>
                <FormLabel>Titel (sv)</FormLabel>
                <FormControl>
                  <Input placeholder="t.ex. Integritetspolicy" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="title_en"
            render={({ field }) => (
              <FormItem className={formLang === "sv" ? "hidden" : ""}>
                <FormLabel>Titel (en)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Privacy policy" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem className={formLang === "en" ? "hidden" : ""}>
                <FormLabel>Innehåll (sv)</FormLabel>
                <FormControl>
                  <RichTextEditor
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Skriv sidans innehåll..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="content_en"
            render={({ field }) => (
              <FormItem className={formLang === "sv" ? "hidden" : ""}>
                <FormLabel>Innehåll (en)</FormLabel>
                <FormControl>
                  <RichTextEditor
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Write page content..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            variant="ghost"
            type="submit"
            className="w-full"
            disabled={isPending}
          >
            {isPending ? <Loader /> : <Save className="h-4 w-4" />}
            {isPending ? "Sparar..." : "Spara"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
