"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
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
  addUserInLessonOldWay,
  type UserPurchasesForCourse,
} from "@/lib/actions/admin";
import { calcRemainingCount } from "@/lib/actions/purchase-helpers";
import { AdminAddUserInLessonSchema } from "@/validations/adminforms";

interface Props {
  usersInCourse: UserPurchasesForCourse[]; // So only users with a product with bookings left in the course.
  lessonId: string;
  refresher: () => void;
}
const formSchema = AdminAddUserInLessonSchema;

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

export default function AddUserBtn({
  usersInCourse,
  lessonId,
  refresher,
}: Props) {
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      lessonId: lessonId,
      userId: "", // Vi väljer den första om finns.
      purchaseItemId: "",
    },
  });

  const router = useRouter();

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const res = await addUserInLessonOldWay(values); // This function we can use later maybe? fix.

    if (res.success) {
      toast.success(res.msg);
      refresher();
      router.refresh();
    } else {
      toast.error(res.msg);
    }
  }
  const selectedUserId = form.watch("userId");
  const selectedUser = usersInCourse.find((u) => u.id === selectedUserId);

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionTrigger>Lägg till elev</AccordionTrigger>
        <AccordionContent>
          <div>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-2 p-2 rounded-xl"
              >
                {/* VÄLJ ELEV */}
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Välj elev:</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("purchaseItemId", ""); // Nollställ produkt när användare byts
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Välj en elev i kursen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {usersInCourse.map((user) => (
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
                  name="purchaseItemId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Produkt att boka ifrån:</FormLabel>
                      {/* Ta bort defaultValue och använd value={field.value} */}
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedUserId}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                selectedUserId
                                  ? "Välj produkt"
                                  : "Välj elev först"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Tillgängliga produkter</SelectLabel>
                            {selectedUser?.purchases.flatMap((pu) =>
                              pu.PurchaseItems.map((item) => {
                                const remaining = calcRemainingCount({
                                  purchase: pu,
                                  purchaseItem: item,
                                });

                                return (
                                  <SelectItem key={item.id} value={item.id}>
                                    {pu.product.name} - {item.course.name} (
                                    {remaining === Infinity ? "∞" : remaining}{" "}
                                    kvar)
                                  </SelectItem>
                                );
                              }),
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
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
