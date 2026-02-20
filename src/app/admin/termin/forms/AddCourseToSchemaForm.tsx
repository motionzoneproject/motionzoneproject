"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import Loader from "@/components/Loader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Course, Termin } from "@/generated/prisma/client";
import { addCoursetoSchema } from "@/lib/actions/admin";
import { formatDateToInput } from "@/lib/date-utils";
import { getCourseName, getVeckodag, getWeekdays } from "@/lib/tools";
import { adminAddCourseToSchemaSchema } from "@/validations/adminforms";

const formSchema = adminAddCourseToSchemaSchema;
type FormValues = z.infer<typeof adminAddCourseToSchemaSchema>;

interface Props {
  termin: Termin;
  allCourses: Course[];
}

export default function AddCourseToSchemaForm({ termin, allCourses }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      courseId: "",
      place: "",
      customEndDate: termin.endDate.toISOString().split("T")[0],
      customStartDate: termin.startDate.toISOString().split("T")[0],
      day: "MONDAY",
      timeStart: "01:00",
      timeEnd: "02:00",
    },
  });

  const terminStartValue = termin.startDate.toISOString().split("T")[0];
  const terminEndValue = termin.endDate.toISOString().split("T")[0];

  const [isOpen, setIsOpen] = useState(false);
  const [useTerminStart, setUseTerminStart] = useState(true);
  const [useTerminEnd, setUseTerminEnd] = useState(true);
  const customStartBackupRef = useRef<string>("");
  const customEndBackupRef = useRef<string>("");

  const isBusy = form.formState.isSubmitting || form.formState.isValidating;

  const weekdays = getWeekdays();

  useEffect(() => {
    if (!isOpen) {
      form.reset();

      setUseTerminStart(true);
      setUseTerminEnd(true);
      customStartBackupRef.current = "";
      customEndBackupRef.current = "";
    }
  }, [isOpen, form]);

  const router = useRouter();

  async function onSubmit(values: FormValues) {
    const res = await addCoursetoSchema(termin.id, values);

    if (res.success) {
      toast.success(res.msg);
      setIsOpen(false);
      router.refresh();
    } else {
      toast.error(res.msg);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(e) => setIsOpen(e)}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="cursor-pointer mb-3">
          <PlusIcon /> Lägg till
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Lägg till kurstillfälle</DialogTitle>
          <DialogDescription>
            Ange vilken veckodag samt mellan vilka tider du vill lägga in
            tillfället. Tillfället blir då bokningsbart av kunder som köpt
            tillgång till kursen.
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle>Nytt kurstillfälle i {termin.name}.</CardTitle>
            <CardDescription></CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-2 p-2 rounded-xl"
              >
                <FormField
                  control={form.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kurs</FormLabel>
                      <Select
                        defaultValue={field.value || ""}
                        onValueChange={
                          (value) =>
                            field.onChange(value === "none" ? undefined : value) // kan ju ha med none ifall vi vill kunna göra så, why not. Dock är detta req så nja.
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Välj kurs" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Välj kurs</SelectLabel>
                            {allCourses.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {getCourseName(c)}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Veckodag</FormLabel>
                      <Select
                        defaultValue={field.value || ""}
                        onValueChange={
                          (value) =>
                            field.onChange(value === "none" ? undefined : value) // kan ju ha med none ifall vi vill kunna göra så, why not. Dock är detta req så nja.
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Välj kurs" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Välj dag</SelectLabel>
                            {weekdays.map((c) => (
                              <SelectItem key={c} value={c}>
                                {getVeckodag(c)}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timeStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start-tid</FormLabel>

                      <FormControl>
                        <Input type="time" step="300" {...field} className="" />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timeEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slut-tid</FormLabel>

                      <FormControl>
                        <Input type="time" step="300" {...field} className="" />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel>Start datum</FormLabel>
                        <label
                          htmlFor="follow-termin-start"
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <Checkbox
                            id="follow-termin-start"
                            checked={useTerminStart}
                            onCheckedChange={(checked) => {
                              const isChecked = checked === true;
                              setUseTerminStart(isChecked);
                              if (isChecked) {
                                customStartBackupRef.current =
                                  form.getValues("customStartDate") ?? "";
                                form.setValue(
                                  "customStartDate",
                                  terminStartValue,
                                  {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  },
                                );
                              } else if (customStartBackupRef.current) {
                                form.setValue(
                                  "customStartDate",
                                  customStartBackupRef.current,
                                  {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  },
                                );
                              }
                            }}
                            className="w-5 h-5"
                          />
                          Följ termin
                        </label>
                      </div>

                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={formatDateToInput(field.value)}
                          onChange={field.onChange}
                          disabled={useTerminStart}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel>Slut datum</FormLabel>
                        <label
                          htmlFor="follow-termin-end"
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <Checkbox
                            id="follow-termin-end"
                            checked={useTerminEnd}
                            onCheckedChange={(checked) => {
                              const isChecked = checked === true;
                              setUseTerminEnd(isChecked);
                              if (isChecked) {
                                customEndBackupRef.current =
                                  form.getValues("customEndDate") ?? "";
                                form.setValue("customEndDate", terminEndValue, {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                              } else if (customEndBackupRef.current) {
                                form.setValue(
                                  "customEndDate",
                                  customEndBackupRef.current,
                                  {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  },
                                );
                              }
                            }}
                            className="w-5 h-5"
                          />
                          Följ termin
                        </label>
                      </div>

                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={formatDateToInput(field.value)}
                          onChange={field.onChange}
                          disabled={useTerminEnd}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="place"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plats</FormLabel>

                      <FormControl>
                        <Input {...field} />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isBusy && <Loader />}
                <Button
                  type="submit"
                  variant="secondary"
                  className="w-full"
                  disabled={isBusy}
                >
                  Lägg till!
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
