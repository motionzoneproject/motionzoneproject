"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner"; // Assuming you use sonner for toasts
import type z from "zod";
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
import { Textarea } from "@/components/ui/textarea"; // Assuming you have a Textarea component
import { createTeacher, updateTeacher } from "@/lib/actions/teacher-actions";
import { adminTeacherSchema } from "@/validations/adminforms";

type TeacherFormProps = {
  teacher?: z.infer<typeof adminTeacherSchema> & { id: string };
  onSuccess?: () => void;
};

export function TeacherForm({ teacher, onSuccess }: TeacherFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const form = useForm({
    resolver: zodResolver(adminTeacherSchema),
    defaultValues: {
      name: teacher?.name || "",
      specialty: teacher?.specialty || "",
      description: teacher?.description || "",
      imageUrl: teacher?.imageUrl || "",
      active: teacher?.active ?? true,
    },
  });

  async function onSubmit(values: z.infer<typeof adminTeacherSchema>) {
    setIsPending(true);
    try {
      const result = teacher
        ? await updateTeacher(teacher.id, values)
        : await createTeacher(values);

      if (result.success) {
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Namn</FormLabel>
              <FormControl>
                <Input placeholder="Förnamn Efternamn" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="specialty"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Specialitet</FormLabel>
              <FormControl>
                <Input placeholder="t.ex. Balett & Modern dans" {...field} />
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beskrivning</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Längre beskrivning om läraren..."
                  className="min-h-[120px]"
                  {...field}
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
              <FormLabel>Bild URL</FormLabel>
              <FormControl>
                <Input placeholder="/bilder/larare.jpg" {...field} />
              </FormControl>
              <FormDescription>Länk till bildfil.</FormDescription>
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
                <FormLabel>Aktiv</FormLabel>
                <FormDescription>
                  Om avmarkerad visas inte läraren på "Om oss"-sidan.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? "Sparar..." : teacher ? "Uppdatera" : "Skapa"}
        </Button>
      </form>
    </Form>
  );
}
