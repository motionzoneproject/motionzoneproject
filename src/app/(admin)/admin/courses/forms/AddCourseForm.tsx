"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import LanguageSwitcherInput from "@/components/LanguageSwitcherInput";
import { RichTextEditor } from "@/components/RichTextEditor";
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
import type { Style, User } from "@/generated/prisma/client";
import { addNewCourse } from "@/lib/actions/admin";
import { useSession } from "@/lib/session-provider";
import { adminAddCourseSchema } from "@/validations/adminforms";

const formSchema = adminAddCourseSchema;

type CourseFormInput = z.input<typeof adminAddCourseSchema>;
type CourseFormOutput = z.output<typeof adminAddCourseSchema>;

interface Props {
  teachers: User[];
  styles: Style[];
  initialLang?: "sv" | "en";
}

export default function AddCourseForm({
  teachers,
  styles,
  initialLang = "sv",
}: Props) {
  const { user } = useSession();
  const form = useForm<CourseFormInput, unknown, CourseFormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      name_en: "",
      description: "",
      description_en: "",
      minAge: "",
      maxAge: "",
      level: "",
      level_en: "",
      adult: false,
      style: "",
      teacherid: user?.id,
    },
  });

  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const _isBusy = form.formState.isSubmitting || form.formState.isValidating;

  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const res = await addNewCourse(values);
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

  const [formLang, setFormLang] = useState(initialLang);

  useEffect(() => {
    if (!isOpen) {
      setFormLang(initialLang);
    }
  }, [initialLang, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(e) => setIsOpen(e)}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="cursor-pointer">
          <Plus />
          Ny kurs
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Skapa ny kurs</DialogTitle>
        </DialogHeader>

        <Card>
          <CardContent>
            <div className="p2 text-sm">
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
                  name="style"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dansstil:</FormLabel>
                      <Select
                        defaultValue={field.value || ""}
                        onValueChange={
                          (value) =>
                            field.onChange(value === "none" ? undefined : value) // kan ju ha med none ifall vi vill kunna göra så, why not. Dock är detta req så nja.
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Välj dansstil" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Välj dansstil</SelectLabel>
                            <SelectItem value="none">
                              {formLang === "en"
                                ? "No dance style"
                                : "Ingen dansstil"}
                            </SelectItem>
                            {styles.map((s) => (
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

                <FormField
                  control={form.control}
                  name={formLang === "en" ? "description_en" : "description"}
                  key={`description-${formLang}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beskrivning ({formLang})</FormLabel>

                      <FormControl>
                        <RichTextEditor
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="Skriv kursbeskrivning..."
                        />
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
                            (ingen högsta ålder är satt)
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
                  <Plus className="h-4 w-4" />
                  Skapa
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
