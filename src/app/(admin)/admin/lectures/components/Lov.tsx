"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import LanguageSwitcherInput from "@/components/LanguageSwitcherInput";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import type { Course, SchemaItem, Termin } from "@/generated/prisma/client";
import { bulkCancelLessons } from "@/lib/actions/admin";
import { formatDateToInputStr } from "@/lib/date-utils";
import { getCourseName } from "@/lib/tools";
import { adminBulkCancelLessonsSchema } from "@/validations/adminforms";

type FormInput = z.input<typeof adminBulkCancelLessonsSchema>;
type FormOutput = z.output<typeof adminBulkCancelLessonsSchema>;

interface Props {
  courses: Course[];
  terminer: Termin[];
  schemaItems: SchemaItem[];
}

export function Lov({ courses, terminer, schemaItems }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTerminId, setSelectedTerminId] = useState<string>("all");
  const [useAllCourses, setUseAllCourses] = useState<boolean>(true);

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(adminBulkCancelLessonsSchema),
    defaultValues: {
      from: formatDateToInputStr(new Date()),
      to: formatDateToInputStr(new Date()),
      courseIds: [],
      message: "Lov",
      message_en: "Holiday",
      cancelled: true,
    },
  });

  const isBusy = form.formState.isSubmitting || form.formState.isValidating;
  const selectedCourseIds = form.watch("courseIds");

  const filteredCourses = useMemo(() => {
    if (selectedTerminId === "all") return courses;

    const ids = new Set(
      schemaItems
        .filter((item) => item.terminId === selectedTerminId)
        .map((item) => item.courseId),
    );

    return courses.filter((course) => ids.has(course.id));
  }, [courses, selectedTerminId, schemaItems]);

  useEffect(() => {
    if (!useAllCourses) return;
    form.setValue(
      "courseIds",
      filteredCourses.map((course) => course.id),
      { shouldValidate: true },
    );
  }, [filteredCourses, form, useAllCourses]);

  async function onSubmit(values: FormInput) {
    const res = await bulkCancelLessons(values);

    if (!res.success) {
      toast.error(res.msg);
      return;
    }

    toast.success(res.msg);
    setIsOpen(false);
    setSelectedTerminId("all");
    setUseAllCourses(true);
    form.reset({
      from: formatDateToInputStr(new Date()),
      to: formatDateToInputStr(new Date()),
      courseIds: [],
      message: "Lov",
      message_en: "Holiday",
      cancelled: true,
    });
    router.refresh();
  }

  const [formLang, setFormLang] = useState<string>("sv");

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="gap-1">
          <Calendar local="sv" className="h-4 w-4" />
          <span>Ställ in flera lektioner</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Ställ in flera lektioner</DialogTitle>
          <DialogDescription>
            Valj datum, kurser och anledning.
          </DialogDescription>
        </DialogHeader>

        <div className="p2 text-sm">
          Formulärspråk:{" "}
          <LanguageSwitcherInput
            value={formLang ?? "sv"}
            setValue={(e) => setFormLang(e)}
          />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="from"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Datum från</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={formatDateToInputStr(field.value)}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Datum till</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={formatDateToInputStr(field.value)}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={formLang === "en" ? "message_en" : "message"}
              key={`message-${formLang}`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meddelande ({formLang})</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Termin</FormLabel>
              <Select
                value={selectedTerminId}
                onValueChange={(value) => setSelectedTerminId(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Valj termin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Valj termin</SelectLabel>
                    <SelectItem value="all">Alla terminer</SelectItem>
                    {terminer.map((termin) => (
                      <SelectItem key={termin.id} value={termin.id}>
                        {termin.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FormItem>

            <FormItem>
              <FormLabel>Urval</FormLabel>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="all-courses"
                  checked={useAllCourses}
                  onCheckedChange={(checked) => {
                    const next = checked === true;
                    setUseAllCourses(next);

                    if (!next) {
                      form.setValue("courseIds", [], { shouldValidate: true });
                    }
                  }}
                />
                <label htmlFor="all-courses" className="text-sm">
                  Alla kurser i vald termin ({filteredCourses.length} st)
                </label>
              </div>
            </FormItem>

            <FormField
              control={form.control}
              name="courseIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kurser</FormLabel>
                  <div className="max-h-56 overflow-auto space-y-2 rounded-md border p-3">
                    {!useAllCourses &&
                      filteredCourses.map((course) => {
                        const checked =
                          field.value?.includes(course.id) ?? false;
                        const checkboxId = `bulk-course-${course.id}`;
                        return (
                          <div
                            key={course.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Checkbox
                              id={checkboxId}
                              checked={checked}
                              onCheckedChange={(c) => {
                                if (c === true) {
                                  field.onChange([
                                    ...(field.value ?? []),
                                    course.id,
                                  ]);
                                  return;
                                }
                                field.onChange(
                                  (field.value ?? []).filter(
                                    (id) => id !== course.id,
                                  ),
                                );
                              }}
                            />
                            <label htmlFor={checkboxId}>
                              {getCourseName(course)}
                            </label>
                          </div>
                        );
                      })}
                    {useAllCourses && (
                      <p className="text-sm text-muted-foreground">
                        Alla kurser i vald termin kommer att ställas in.
                      </p>
                    )}
                    {!useAllCourses && filteredCourses.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Inga kurser hittades for vald termin.
                      </p>
                    )}
                    {!useAllCourses && selectedCourseIds.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Valda kurser: {selectedCourseIds.length}
                      </p>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

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
      </DialogContent>
    </Dialog>
  );
}
