"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner"; // Assuming you use sonner for toasts
import type z from "zod";
import ImageInput from "@/components/ImageInput";
import LanguageSwitcherInput from "@/components/LanguageSwitcherInput";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createTeacher,
  type TeacherWithProfile,
  updateTeacher,
} from "@/lib/actions/teacher-actions";
import { uploadImageFromBlob } from "@/lib/uploads";
import { adminTeacherSchema } from "@/validations/adminforms";

type TeacherFormProps = {
  teacher?: TeacherWithProfile;
  users: TeacherWithProfile[];
  onSuccess?: () => void;
  initialLang?: "sv" | "en";
};

export function TeacherForm({
  teacher,
  users,
  onSuccess,
  initialLang = "sv",
}: TeacherFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const profile = teacher?.teacherProfile ?? null;
  const availableUsers = users.filter(
    (user) => !user.teacherProfile || user.id === teacher?.id,
  );

  const form = useForm({
    resolver: zodResolver(adminTeacherSchema),
    defaultValues: {
      userId: teacher?.id || "",
      name: teacher?.name || "",
      specialty: profile?.specialty || "",
      specialty_en: profile?.specialty_en || "",
      description: profile?.description || "",
      description_en: profile?.description_en || "",
      imageUrl: profile?.imageUrl || "",
      active: profile?.active ?? true,
    },
  });

  const [formLang, setFormLang] = useState(initialLang);
  const errors = form.formState.errors;

  useEffect(() => {
    if (errors.specialty || errors.description) {
      setFormLang("sv");
    } else if (errors.specialty_en || errors.description_en) {
      setFormLang("en");
    }
  }, [errors]);

  const selectedUserId = form.watch("userId");
  const selectedUser = availableUsers.find(
    (user) => user.id === selectedUserId,
  );

  useEffect(() => {
    if (!selectedUser) return;
    form.setValue("name", selectedUser.name, { shouldValidate: true });
  }, [form, selectedUser]);

  async function onSubmit(values: z.infer<typeof adminTeacherSchema>) {
    setIsPending(true);
    try {
      const oldImageUrl = profile?.imageUrl ?? "";
      let finalImageURL = values.imageUrl ?? "";

      if (finalImageURL.startsWith("blob:")) {
        try {
          const res = await fetch(finalImageURL);
          const blob = await res.blob();
          finalImageURL = await uploadImageFromBlob(
            blob,
            "teachers",
            values.userId,
          );
          URL.revokeObjectURL(values.imageUrl ?? "");
        } catch (e) {
          console.error(e);
          toast.error(`Uppladdning misslyckades.`);
          return;
        }
      }

      if (teacher && !profile) {
        toast.error("Kunde inte hitta lärarprofilen.");
        return;
      }

      const result = teacher
        ? await updateTeacher(profile?.id ?? "", {
            ...values,
            name: selectedUser?.name ?? values.name,
            imageUrl: finalImageURL,
          })
        : await createTeacher({
            ...values,
            name: selectedUser?.name ?? values.name,
            imageUrl: finalImageURL,
          });

      if (result.success) {
        if (teacher && oldImageUrl && finalImageURL !== oldImageUrl) {
          try {
            const removeRes = await fetch("/api/remove", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: oldImageUrl }),
            });

            const removeData = await removeRes.json().catch(() => null);
            if (!removeRes.ok) {
              throw new Error(removeData?.error || "Remove failed");
            }
            toast("Gammal bild borttagen");
          } catch (err) {
            toast(String(err));
          }
        }

        toast.success(result.msg);
        if (onSuccess) {
          onSuccess();
        } else {
          // If used in a page directly, refresh
          router.refresh();
          form.reset();
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
            name="userId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Användare</FormLabel>
                <Select
                  value={field.value || ""}
                  onValueChange={field.onChange}
                  disabled={!!teacher}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj användare" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="specialty"
            render={({ field }) => (
              <FormItem className={formLang === "en" ? "hidden" : ""}>
                <FormLabel>Specialitet (sv)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="t.ex. Balett & Modern dans"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormDescription>
                  Kort beskrivning av vad läraren undervisar i.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="specialty_en"
            render={({ field }) => (
              <FormItem className={formLang === "sv" ? "hidden" : ""}>
                <FormLabel>Specialitet (en)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Ballet & Contemporary dance"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormDescription>
                  Short description of what the teacher teaches.
                </FormDescription>
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
                    placeholder="Skriv lärarens biografi..."
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
                    placeholder="Write the teacher biography..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bild</FormLabel>

                <FormControl>
                  <ImageInput {...field} value={field.value || ""} />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                <FormControl>
                  <Checkbox
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Visa</FormLabel>
                  <FormDescription>
                    Om avmarkerad visas inte läraren på "Om oss"-sidan.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <Button
            variant="ghost"
            type="submit"
            className="w-full"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : teacher ? (
              <Save className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {isPending ? "Sparar..." : teacher ? "Spara" : "Skapa"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
