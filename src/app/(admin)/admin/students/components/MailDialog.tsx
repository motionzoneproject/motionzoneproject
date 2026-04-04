"use client";

import type { MDXEditorMethods } from "@mdxeditor/editor";
import { MailsIcon } from "lucide-react";
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
import type { SelectedStudent } from "./studentSelection";
import "@mdxeditor/editor/style.css";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ForwardRefEditor } from "./ForwardRefEditor";

interface Props {
  selectedStudents: SelectedStudent[];
}

export const mailSchema = z.object({
  headline: z.string().min(1).max(250),
  content: z.string().min(1).max(80000),
});

export function MailDialog({ selectedStudents }: Props) {
  const ref = useRef<MDXEditorMethods>(null);
  const [editorKey, _setEditorKey] = useState<string>(Math.random().toString()); // Lägg till ett state för nyckeln

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
          <MailsIcon /> Maila markerade
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            <MailsIcon />
            Mailutskick
          </DialogTitle>
          <DialogDescription>
            {selectedStudents.length} mottagare är valda för utskicket.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(sendMailSub)}
              className="space-y-3"
            >
              <FormField
                control={form.control}
                name="headline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rubrik</FormLabel>
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
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <ForwardRefEditor
                        markdown={field.value || ""}
                        {...field}
                        ref={ref}
                        key={editorKey}
                        placeholder="Write the content using markdown..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit">Send!</Button>
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
