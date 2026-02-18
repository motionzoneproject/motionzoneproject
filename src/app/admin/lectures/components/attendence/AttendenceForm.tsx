"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
  type StudentWithPurchaseItemsWithCourse,
} from "@/lib/actions/admin";
import {
  calcRemainingCount,
  showRemaining,
  showTypeInSwedish,
} from "@/lib/actions/purchase-helpers";
import { AddStudentToLessonForm } from "@/validations/adminforms";
import { AttendeceItem } from "./AttendenceItem";

interface Props {
  lessonId: string;
  studentsAndPurchases: StudentWithPurchaseItemsWithCourse[];
  bookings: BookingWithUserAndParticipant[];
}

const formSchema = AddStudentToLessonForm;

// Vi behöver hämta participants som elever i listan, och sen deras produkter.

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

export function AttendenceForm({
  lessonId,
  bookings,
  studentsAndPurchases,
}: Props) {
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      lessonId: lessonId,
      userId: "",
      purchaseItemId: "",
    },
  });

  const router = useRouter();

  const userIdByStudentId = useMemo(
    () =>
      new Map(studentsAndPurchases.map((s) => [s.studentId, s.customer.id])),
    [studentsAndPurchases],
  );

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const res = await addUserInLesson(values);
    if (res.success) {
      toast.success(res.msg);
      router.refresh();
    } else {
      toast.error(res.msg);
    }
  }

  const getUserId = (studentId: string) =>
    userIdByStudentId.get(studentId) ?? "";

  const [selectedStudentId, setSelectedStudentId] = useState("");

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
                <FormItem>
                  <FormLabel>Deltagare</FormLabel>

                  <Select
                    onValueChange={(value) => {
                      setSelectedStudentId(value);
                      form.setValue("userId", getUserId(value));
                      form.setValue("purchaseItemId", "");
                    }}
                    value={selectedStudentId}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Välj en elev i kursen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {studentsAndPurchases.map((c) => (
                        <SelectItem key={c.studentId} value={c.studentId}>
                          {c.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
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
                        disabled={!selectedStudentId}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                selectedStudentId
                                  ? "Välj produkt"
                                  : "Välj deltagare först"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Tillgängliga produkter</SelectLabel>

                            {studentsAndPurchases
                              .filter((s) => s.studentId === selectedStudentId)
                              .flatMap((pi) => pi.purchaseItems)
                              .map((p) => {
                                const remaining = calcRemainingCount({
                                  purchase: p.purchase,
                                  purchaseItem: p.purchaseItem,
                                });

                                return (
                                  <SelectItem
                                    key={p.purchaseItem.id}
                                    value={p.purchaseItem.id}
                                  >
                                    {p.purchase.product.name} (
                                    {showTypeInSwedish(p.purchase.type)}) -{" "}
                                    {showRemaining(remaining)} kvar
                                  </SelectItem>
                                );
                              })}
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

                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormLabel>UserId</FormLabel>
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
        <AttendeceItem
          booking={b}
          participant={b.purchaseItem.purchase.participant}
          key={b.id}
          purchaseItem={b.purchaseItem}
          user={b.user}
          product={b.purchaseItem.purchase.product}
        />
      ))}
    </div>
  );
}
