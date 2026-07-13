"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
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
import { updateParticipant } from "@/lib/actions/participants";
import { formatDateToInputStr } from "@/lib/date-utils";

const formSchema = z.object({
  name: z.string().min(2, "Namn måste vara minst 2 tecken"),
  email: z.string().email("Ogiltig e-post").or(z.literal("")),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  allowPhotoVideo: z.boolean(),
});

interface EditParticipantFormProps {
  participant: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    dateOfBirth?: Date | string | null;
    allowPhotoVideo: boolean;
  };
}

export default function EditParticipantForm({
  participant,
}: EditParticipantFormProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: participant.name,
      email: participant.email || "",
      phone: participant.phone || "",
      dateOfBirth: formatDateToInputStr(participant.dateOfBirth),
      allowPhotoVideo: participant.allowPhotoVideo,
    },
  });

  useEffect(() => {
    if (!open) return;

    form.reset({
      name: participant.name,
      email: participant.email || "",
      phone: participant.phone || "",
      dateOfBirth: formatDateToInputStr(participant.dateOfBirth),
      allowPhotoVideo: participant.allowPhotoVideo,
    });
  }, [
    open,
    form,
    participant.name,
    participant.email,
    participant.phone,
    participant.dateOfBirth,
    participant.allowPhotoVideo,
  ]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await updateParticipant(participant.id, {
        ...values,
        dateOfBirth: values.dateOfBirth || undefined,
        email: values.email || undefined,
      });
      toast.success("Deltagare uppdaterad!");
      setOpen(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Misslyckades att uppdatera";
      toast.error("Misslyckades att uppdatera", { description: message });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Redigera</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Redigera deltagare</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Namn</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-post (valfri)</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefon (valfri)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Födelsedatum (valfri)</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allowPhotoVideo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Godkänner foto/video för sociala medier
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
                Avbryt
              </Button>
              <Button type="submit" variant="ghost">
                <Save className="h-4 w-4" />
                Spara ändringar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
