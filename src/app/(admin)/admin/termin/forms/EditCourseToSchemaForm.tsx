"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import LanguageSwitcherInput from "@/components/LanguageSwitcherInput";
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
import type { Course, SchemaItem, Termin } from "@/generated/prisma/client";
import { editCourseInSchema } from "@/lib/actions/admin";
import { formatDateToInput } from "@/lib/date-utils";
import { dbToFormTime } from "@/lib/time-convert";
import { getCourseName, getVeckodag, getWeekdays } from "@/lib/tools";
import { adminAddCourseToSchemaSchema } from "@/validations/adminforms";

const formSchema = adminAddCourseToSchemaSchema;
type FormValues = z.infer<typeof adminAddCourseToSchemaSchema>;

interface Props {
  termin: Termin;
  allCourses: Course[];
  weekdays: string[];
  schemaItem: SchemaItem;
  initialLang?: "sv" | "en";
}

export default function EditCourseToSchemaForm({
  termin,
  allCourses,
  schemaItem,
  initialLang = "sv",
}: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      courseId: schemaItem.courseId,
      place: schemaItem.place ?? "",
      place2: schemaItem.place2 ?? "",
      customEndDate:
        schemaItem.customEndDate?.toISOString().split("T")[0] ??
        termin.endDate.toISOString().split("T")[0],
      customStartDate:
        schemaItem.customStartDate?.toISOString().split("T")[0] ??
        termin.startDate.toISOString().split("T")[0],
      day: schemaItem.weekday,
      timeStart: dbToFormTime(schemaItem.timeStart),
      timeEnd: dbToFormTime(schemaItem.timeEnd),
    },
  });

  const [formLang, setFormLang] = useState(initialLang);

  const terminStartValue = termin.startDate.toISOString().split("T")[0];
  const terminEndValue = termin.endDate.toISOString().split("T")[0];

  const sameDayUtc = useCallback(
    (a?: Date | null, b?: Date | null) =>
      !!a &&
      !!b &&
      a.getUTCFullYear() === b.getUTCFullYear() &&
      a.getUTCMonth() === b.getUTCMonth() &&
      a.getUTCDate() === b.getUTCDate(),
    [],
  );

  const [isOpen, setIsOpen] = useState(false);
  const [useTerminStart, setUseTerminStart] = useState(
    !schemaItem.customStartDate ||
      sameDayUtc(schemaItem.customStartDate, termin.startDate),
  );
  const [useTerminEnd, setUseTerminEnd] = useState(
    !schemaItem.customEndDate ||
      sameDayUtc(schemaItem.customEndDate, termin.endDate),
  );
  const customStartBackupRef = useRef<string>("");
  const customEndBackupRef = useRef<string>("");
  const isBusy = form.formState.isSubmitting || form.formState.isValidating;

  useEffect(() => {
    if (!isOpen) {
      form.reset({
        courseId: schemaItem.courseId,
        place: schemaItem.place ?? "",
        place2: schemaItem.place2 ?? "",
        customEndDate:
          schemaItem.customEndDate?.toISOString().split("T")[0] ??
          termin.endDate.toISOString().split("T")[0],
        customStartDate:
          schemaItem.customStartDate?.toISOString().split("T")[0] ??
          termin.startDate.toISOString().split("T")[0],
        day: schemaItem.weekday,
        timeStart: dbToFormTime(schemaItem.timeStart),
        timeEnd: dbToFormTime(schemaItem.timeEnd),
      });

      setUseTerminStart(
        !schemaItem.customStartDate ||
          sameDayUtc(schemaItem.customStartDate, termin.startDate),
      );
      setUseTerminEnd(
        !schemaItem.customEndDate ||
          sameDayUtc(schemaItem.customEndDate, termin.endDate),
      );

      customStartBackupRef.current = "";
      customEndBackupRef.current = "";
    }
  }, [
    isOpen,
    form,
    sameDayUtc,
    schemaItem.customEndDate,
    schemaItem.customStartDate,
    termin.endDate,
    termin.startDate,
    schemaItem.courseId,
    schemaItem.place,
    schemaItem.place2,
    schemaItem.timeEnd,
    schemaItem.timeStart,
    schemaItem.weekday,
  ]);

  const router = useRouter();

  async function onSubmit(values: FormValues) {
    const res = await editCourseInSchema(termin.id, schemaItem.id, values);
    if (res.success) {
      toast.success(res.msg);
      setIsOpen(false);
      router.refresh();
    } else {
      toast.error(res.msg);
    }
  }

  const weekdays = getWeekdays();

  return (
    <Dialog open={isOpen} onOpenChange={(e) => setIsOpen(e)}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Redigera kurstillfälle</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Lägg till kurstillfälle i veckoschemat</DialogTitle>
          <DialogDescription>
            Ange vilken veckodag samt mellan vilka tider du vill lägga in
            tillfället. Tillfället blir då{" "}
            <span className="bold">bokningsbart</span> av kunder som köpt
            tillgång till kursen.
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle>Ändra kurstillfälle i {termin.name}.</CardTitle>
            <CardDescription></CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p2 text-sm my-2">
              Formulärspråk:{" "}
              <LanguageSwitcherInput
                value={formLang ?? "sv"}
                setValue={(e) => setFormLang(e === "en" ? "en" : "sv")}
              />
            </div>
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
                                {getCourseName(c, formLang)}
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
                                {getVeckodag(c, formLang)}
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
                    <FormItem
                      className={`${formLang === "sv" ? "" : "hidden"}`}
                    >
                      <FormLabel>Plats ({formLang})</FormLabel>

                      <FormControl>
                        <Input {...field} />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="place2"
                  render={({ field }) => (
                    <FormItem
                      className={`${formLang === "sv" ? "hidden" : ""}`}
                    >
                      <FormLabel>Plats ({formLang})</FormLabel>

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
                  variant="ghost"
                  className="w-full"
                  disabled={isBusy}
                >
                  <Save className="h-4 w-4" />
                  Spara
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              <X className="h-4 w-4" />
              Avbryt
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
