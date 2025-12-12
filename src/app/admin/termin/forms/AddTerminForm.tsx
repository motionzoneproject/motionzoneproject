"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DialogClose } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { addNewTermin } from "@/lib/actions/admin";
import { adminAddTerminSchema } from "@/validations/adminforms";

const formSchema = adminAddTerminSchema;
type FormValues = z.infer<typeof adminAddTerminSchema>;

export default function AddTerminForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      startDate: "",
      endDate: "",
    },
  });

  const router = useRouter();

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const res = await addNewTermin(values);
    if (res.success) {
      toast.success(res.msg);
      router.refresh();
    } else {
      toast.error(res.msg);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skapa ny termin.</CardTitle>
        <CardDescription></CardDescription>
      </CardHeader>
      <CardContent>
        <br />
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-2 p-2 rounded-xl"
          >
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
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start datum</FormLabel>

                  <FormControl>
                    <Input type="date" {...field} />
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
                    <Input type="date" {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogClose asChild>
              <Button type="submit">Skapa</Button>
            </DialogClose>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
