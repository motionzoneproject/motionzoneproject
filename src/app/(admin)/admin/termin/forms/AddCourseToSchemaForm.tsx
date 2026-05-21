"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
import type { Course, Studio, Termin } from "@/generated/prisma/client";
import { addCoursetoSchema } from "@/lib/actions/admin-terminer";
import { formatDateToInputStr } from "@/lib/date-utils";
import { getCourseName, getVeckodag, getWeekdays } from "@/lib/tools";
import { adminAddCourseToSchemaSchema } from "@/validations/adminforms";

const formSchema = adminAddCourseToSchemaSchema;
type FormValues = z.infer<typeof adminAddCourseToSchemaSchema>;

interface Props {
  termin: Termin;
  allCourses: Course[];
  allStudios: Studio[];
  initialLang?: "sv" | "en";
}

export default function AddCourseToSchemaForm({
  termin,
  allCourses,
  allStudios,
  initialLang = "sv",
}: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      courseId: "",
      studio: "",
      customEndDate: formatDateToInputStr(termin.endDate),
      customStartDate: formatDateToInputStr(termin.startDate),
      day: "MONDAY",
      timeStart: "01:00",
      timeEnd: "02:00",
    },
  });

  const [formLang, setFormLang] = useState(initialLang);

  const terminStartValue = formatDateToInputStr(termin.startDate);
  const terminEndValue = formatDateToInputStr(termin.endDate);

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
    const payload = {
      ...values,
      customStartDate: useTerminStart ? undefined : values.customStartDate,
      customEndDate: useTerminEnd ? undefined : values.customEndDate,
      studio: values.studio === "none" ? undefined : values.studio,
    };
    const res = await addCoursetoSchema(termin.id, payload);

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
        <Button variant="ghost" className="cursor-pointer mb-3">
          <PlusIcon /> Lägg till
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Lägg till kurstillfälle</DialogTitle>
          <DialogDescription>
            Ange vilken veckodag samt mellan vilka tider du vill lägga in
            tillfället. Lektioner kommer skapas i perioden, och tillfället blir
            då bokningsbart av kunder som köpt tillgång till kursen.
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle>
              Nytt kurstillfälle i{" "}
              {formLang === "en" ? termin.name_en : termin.name}.
            </CardTitle>
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
                              } else {
                                form.setValue(
                                  "customEndDate",
                                  customStartBackupRef.current ||
                                    terminStartValue,
                                  { shouldDirty: true, shouldValidate: true },
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
                          value={formatDateToInputStr(field.value)}
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
                              } else {
                                form.setValue(
                                  "customStartDate",
                                  customStartBackupRef.current ||
                                    terminStartValue,
                                  { shouldDirty: true, shouldValidate: true },
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
                          value={formatDateToInputStr(field.value)}
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
                  name="studio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Studio:</FormLabel>
                      <Select
                        defaultValue={field.value || ""}
                        onValueChange={
                          (value) =>
                            field.onChange(value === "none" ? undefined : value) // kan ju ha med none ifall vi vill kunna göra så, why not. Dock är detta req så nja.
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Välj studio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Välj studio</SelectLabel>
                            <SelectItem value="none">
                              {formLang === "en" ? "No studio" : "Ingen studio"}
                            </SelectItem>
                            {allStudios.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {formLang === "en"
                                  ? (s.name_en ?? s.name)
                                  : s.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>

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
                  <PlusIcon className="h-4 w-4" />
                  Lägg till
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
