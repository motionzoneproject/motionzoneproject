"use client";

import type { MDXEditorMethods } from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailsIcon } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
import { sendStudentNewsletter } from "@/lib/actions/newsletter";
import { ForwardRefEditor } from "../../../../../components/ui/ForwardRefEditor";
import type { SelectedStudent } from "./studentSelection";

interface Props {
  selectedStudents: SelectedStudent[];
}

export const mailSchema = z.object({
  headline: z.string().min(1).max(250),
  content: z.string().min(1).max(80000),
});

export function MailDialog({ selectedStudents }: Props) {
  const ref = useRef<MDXEditorMethods>(null);
  const formId = useId();
  const [isSending, setIsSending] = useState(false);

  const form = useForm<z.infer<typeof mailSchema>>({
    resolver: zodResolver(mailSchema),
    defaultValues: {
      headline: "",
      content: "",
    },
  });

  async function sendMailSub(values: z.infer<typeof mailSchema>) {
    setIsSending(true);

    try {
      const result = await sendStudentNewsletter({
        recipients: selectedStudents.map((student) => ({
          name: student.name,
          email: student.email,
        })),
        headline: values.headline,
        content: values.content,
      });

      if (result.success) {
        toast.success(result.msg);
        return;
      }

      if (result.data?.sentCount) {
        const failedEmails = result.data.results
          .filter((entry) => !entry.success)
          .map((entry) => entry.email)
          .slice(0, 3)
          .join(", ");

        toast.error(result.msg, {
          description: failedEmails || undefined,
        });
        return;
      }

      toast.error(result.msg);
    } catch (error) {
      console.error(error);
      toast.error("Kunde inte skicka mailutskicket.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={selectedStudents.length === 0}
        >
          <MailsIcon /> Maila markerade elever
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] min-w-0 overflow-x-hidden overflow-y-visible sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Mailutskick</DialogTitle>
          <DialogDescription>
            {selectedStudents.length}st mottagare är valda för utskicket.
          </DialogDescription>
        </DialogHeader>
        <div className="min-w-0 max-h-[65dvh] overflow-x-hidden overflow-y-auto pr-1">
          <Form {...form}>
            <form
              id={formId}
              onSubmit={form.handleSubmit(sendMailSub)}
              className="min-w-0 space-y-3"
            >
              <FormField
                control={form.control}
                name="headline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ämne</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Innehåll</FormLabel>
                    <FormControl>
                      <ForwardRefEditor
                        markdown={field.value || ""}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                        ref={ref}
                        placeholder="Write the content using markdown..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Stäng
            </Button>
          </DialogClose>
          <Button
            type="submit"
            form={formId}
            disabled={isSending || selectedStudents.length === 0}
          >
            {isSending ? "Skickar..." : "Skicka!"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
