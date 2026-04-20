"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { notFound, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addUserInLesson } from "@/lib/actions/admin-bookings";
import { calcRemainingCount } from "@/lib/actions/purchase-helpers";
import type { UserPurchaseWithProduct } from "@/lib/actions/server-actions";
import { useSession } from "@/lib/session-provider";
import { AdminAddUserInLessonSchema } from "@/validations/adminforms";

const formSchema = AdminAddUserInLessonSchema;

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

interface Props {
  lessonId: string;
  purschaseItems: UserPurchaseWithProduct[];
  disabled?: boolean;
}

export default function AddTerminForm({
  lessonId,
  purschaseItems,
  disabled,
}: Props) {
  const { user } = useSession();

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: user?.id,
      lessonId: lessonId,
      purchaseItemId: "",
    },
  });

  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const res = await addUserInLesson(values);
    if (res.success) {
      toast.success(res.msg);
      setIsOpen(false);
      router.refresh();
    } else {
      toast.error(res.msg);
    }
  }

  if (!user) return notFound();

  return (
    <Dialog open={isOpen} onOpenChange={(e) => setIsOpen(e)}>
      <DialogTrigger asChild>
        <Button
          variant={"default"}
          className="cursor-pointer gap-1.5"
          disabled={!!disabled}
        >
          <PlusIcon className="h-4 w-4" />
          Boka
        </Button>
      </DialogTrigger>

      <DialogContent className="overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Boka lektionen</DialogTitle>
        </DialogHeader>

        <Card>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-2 p-2 rounded-xl"
              >
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormLabel>Userid</FormLabel>
                      <FormControl>
                        <Input type="hidden" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lessonId"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormLabel>lektion id</FormLabel>
                      <FormControl>
                        <Input type="hidden" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purchaseItemId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Välj kurs:</FormLabel>

                      <FormControl>
                        <Select
                          defaultValue={field.value || ""}
                          onValueChange={async (value) => {
                            field.onChange(
                              value === "none" ? undefined : value,
                            ); // kan ju ha med none ifall vi vill kunna göra så, why not. Dock är detta req så nja.
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Välj kurs" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Välj kurs</SelectLabel>
                              {purschaseItems.map((c) => {
                                const remaining = calcRemainingCount({
                                  purchase: c.purchase,
                                  purchaseItem: c,
                                });

                                return (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.purchase.product.name} (
                                    {c.purchase.participant?.name ?? "Du"}) (
                                    {remaining === Infinity ? "∞" : remaining})
                                  </SelectItem>
                                );
                              })}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  Boka
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
