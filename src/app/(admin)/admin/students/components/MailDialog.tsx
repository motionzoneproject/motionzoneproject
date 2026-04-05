"use client";

import type { MDXEditorMethods } from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailsIcon } from "lucide-react";
import { useRef } from "react";
import { useForm } from "react-hook-form";
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

  const form = useForm<z.infer<typeof mailSchema>>({
    resolver: zodResolver(mailSchema),
    defaultValues: {
      headline: "",
      content: "",
    },
  });

  async function sendMailSub(values: z.infer<typeof mailSchema>) {
    console.log(JSON.stringify(values));
    alert(JSON.stringify(values));
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
          <DialogTitle>
            <MailsIcon />
            Mailutskick
          </DialogTitle>
          <DialogDescription>
            {selectedStudents.length}st mottagare är valda för utskicket.
          </DialogDescription>
        </DialogHeader>
        <div className="min-w-0 max-h-[65dvh] overflow-x-hidden overflow-y-auto pr-1">
          <Form {...form}>
            <form
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

              <Button type="submit">Skicka!</Button>
            </form>
          </Form>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Stäng
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
