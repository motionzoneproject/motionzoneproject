"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EditIcon, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import LanguageSwitcherInput from "@/components/LanguageSwitcherInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import type { Course, User } from "@/generated/prisma/client";
import { editCourse } from "@/lib/actions/admin";
import { adminAddCourseSchema } from "@/validations/adminforms";

const formSchema = adminAddCourseSchema;

type CourseFormInput = z.input<typeof adminAddCourseSchema>;
type CourseFormOutput = z.output<typeof adminAddCourseSchema>;

interface Props {
  course: Course;
  teachers: User[]; // fix: Vi tar emot lärare så behövs bara en select.
}

export default function EditCourseForm({ course, teachers }: Props) {
  const form = useForm<CourseFormInput, unknown, CourseFormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: course.name,
      name_en: course.name_en ?? "",
      description: course.description,
      description_en: course.description_en ?? "",
      minAge: course.minAge,
      maxAge: course.maxAge,
      level: course.level ?? "",
      adult: course.adult,
      teacherid: course.teacherId,
    },
  });

  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    form.reset({
      name: course.name,
      name_en: course.name_en ?? "",
      description: course.description,
      description_en: course.description_en ?? "",
      minAge: course.minAge,
      maxAge: course.maxAge,
      level: course.level ?? "",
      level_en: course.level_en ?? "",
      adult: course.adult,
      teacherid: course.teacherId,
    });
  }, [
    isOpen,
    form,
    course.name,
    course.name_en,
    course.description,
    course.description_en,
    course.minAge,
    course.maxAge,
    course.level,
    course.adult,
    course.teacherId,
    course.level_en,
  ]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const res = await editCourse(course.id, values);
    if (res.success) {
      toast.success(res.msg);
      setIsOpen(false);
      router.refresh();
    } else {
      toast.error(res.msg);
    }
  }

  const minAgeValue = form.watch("minAge");
  const minAgeTrim: string = String(minAgeValue ?? "").trim();

  const maxAgeValue = form.watch("maxAge");
  const maxAgeTrim: string = String(maxAgeValue ?? "").trim();
  const [formLang, setFormLang] = useState("sv");

  const _key = crypto.randomUUID();

  return (
    <Dialog open={isOpen} onOpenChange={(e) => setIsOpen(e)}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="cursor-pointer">
          <EditIcon />
          <span className="sr-only">Ändra kurs</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Ändra en kurs</DialogTitle>
        </DialogHeader>

        <Card>
          <CardContent>
            <div className="p2 text-sm">
              Formulärspråk:{" "}
              <LanguageSwitcherInput
                value={formLang ?? "sv"}
                setValue={(e) => setFormLang(e)}
              />
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-2 p-2 rounded-xl"
              >
                <FormField
                  control={form.control}
                  name={formLang === "en" ? "name_en" : "name"}
                  key={`name-${formLang}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kursnamn ({formLang})</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={formLang === "en" ? "description_en" : "description"}
                  key={`description-${formLang}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beskrivning ({formLang})</FormLabel>

                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minAge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Minsta ålder
                        {(form.watch("minAge") as number) <= 0 ||
                        minAgeTrim === "" ? (
                          <div className="text-yellow-800">
                            (ingen minsta ålder är satt)
                          </div>
                        ) : (
                          ""
                        )}
                      </FormLabel>

                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          {...field}
                          value={
                            field.value === undefined ? "" : String(field.value)
                          }
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxAge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Hösta ålder
                        {(form.watch("maxAge") as number) <= 0 ||
                        maxAgeTrim === "" ? (
                          <div className="text-yellow-800">
                            (ingen minsta ålder är satt)
                          </div>
                        ) : (
                          ""
                        )}
                      </FormLabel>

                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          {...field}
                          value={
                            field.value === undefined ? "" : String(field.value)
                          }
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="adult"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vuxen</FormLabel>

                      <FormControl>
                        <Checkbox
                          checked={field.value as boolean}
                          onCheckedChange={(checked: boolean) =>
                            field.onChange(checked)
                          }
                          className="w-6 h-6"
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={formLang === "en" ? "level_en" : "level"}
                  key={`level-${formLang}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nivå ({formLang})</FormLabel>

                      <FormControl>
                        <Input {...field} />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="teacherid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lärare:</FormLabel>

                      <Select
                        defaultValue={field.value || ""}
                        onValueChange={
                          (value) =>
                            field.onChange(value === "none" ? undefined : value) // kan ju ha med none ifall vi vill kunna göra så, why not. Dock är detta req så nja.
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Välj lärare" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Välj lärare</SelectLabel>
                            {teachers.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button variant="ghost" type="submit" className="w-full">
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
              Avbryt
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
