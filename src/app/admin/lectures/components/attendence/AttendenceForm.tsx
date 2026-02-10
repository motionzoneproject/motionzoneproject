"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addUserInLesson,
  type BookingWithUserAndParticipant,
  type UserPurchasesForCourse,
} from "@/lib/actions/admin";
import { calcRemainingCount } from "@/lib/actions/purchase-helpers";
import { AdminAddStudentToLessonForm } from "@/validations/adminforms";

interface Props {
  lessonId: string;
  studentsAndPurchases: UserPurchasesForCourse[];
  bookings: BookingWithUserAndParticipant[];
}

const formSchema = AdminAddStudentToLessonForm;

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

export function AttendenceForm({
  lessonId,
  bookings,
  studentsAndPurchases,
}: Props) {
  const [selectedUser, _setSelectedUser] = useState("");

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      lessonId: lessonId,
      participant: "",
      userId: "",
      purchaseItemId: "",
    },
  });

  const router = useRouter();

  async function onSubmit(values: z.infer<typeof formSchema>) {
    alert(JSON.stringify(values));
    const res = await addUserInLesson(values); // This function we can use later maybe? fix.
    alert(JSON.stringify(res));
    if (res.success) {
      toast.success(res.msg);
      router.refresh();
    } else {
      toast.error(res.msg);
    }
  }

  return (
    <div>
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Lägg till elev</AccordionTrigger>
          <AccordionContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-2 p-2 rounded-xl"
              >
                {JSON.stringify(form.formState.errors)}
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Elev</FormLabel>

                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Välj en elev i kursen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {studentsAndPurchases.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                ></FormField>

                <FormField
                  control={form.control}
                  name="purchaseItemId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Produkt att boka ifrån:</FormLabel>
                      {/* Ta bort defaultValue och använd value={field.value} */}
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                        value={field.value}
                        disabled={!form.watch("userId")}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                selectedUser
                                  ? "Välj produkt"
                                  : "Välj elev först"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Tillgängliga produkter</SelectLabel>

                            {studentsAndPurchases
                              .filter(
                                (user) => user.id === form.watch("userId"),
                              )
                              .flatMap((user) =>
                                user.purchases.flatMap((purchase) =>
                                  purchase.PurchaseItems.map((item) => {
                                    const remaining = calcRemainingCount({
                                      purchase,
                                      purchaseItem: item,
                                    });

                                    return (
                                      <SelectItem key={item.id} value={item.id}>
                                        {purchase.product.name} (
                                        {purchase.participant?.name}) -{" "}
                                        {item.course.name} (
                                        {remaining === Infinity
                                          ? "∞"
                                          : remaining}{" "}
                                        kvar)
                                      </SelectItem>
                                    );
                                  }),
                                ),
                              )}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lessonId"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormLabel>Lektion</FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  Lägg till i lektionen
                </Button>
              </form>
            </Form>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {bookings.map((b) => (
        <div key={b.id}>
          {b.purchaseItem.purchase.participant?.name ?? b.user.name}
        </div>
      ))}
    </div>
  );
}
