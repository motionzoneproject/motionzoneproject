"use client";

/* 

Skillnaden i formulären (AddCourseForm och EditCourseForm) mellan din branch och profilsidor är i korthet:

maxbookings hanteras om:

I profilsidor finns unlimitedBookings (checkbox) som styr om maxbookings ska vara 0.
Fältet för numeriskt max visas bara när unlimitedBookings är av.
Min-värde ändrat till 1 när begränsat läge används.
maxCustomers är borttaget i båda formulären i profilsidor.

Bättre submit-state:

isBusy (isSubmitting || isValidating)
spinner + disable på submit-knapp under submit.
Förhandsvisning av kursnamn:

getCourseName(...) används live i formuläret för preview baserat på namn/ålder/level/adult.
UI/textjusteringar:

Add: knapp ändrad till variant="secondary" (istället för grön default).
Edit: trigger ändrad till ikonknapp (Pencil) istället för textknapp.
Label Namn -> Dansstil / kurs.
“varningsruta med Flag” om lärare är borttagen.
Hjälptexter bytta från gul text till text-muted-foreground.
Default values:

Add: default maxbookings: 1, unlimitedBookings: true.
Edit: unlimitedBookings sätts från befintlig kurs (course.maxBookings <= 0).
Små skillnader/inkonsekvens i profilsidor:

I EditCourseForm står dialogtiteln fortfarande Skapa en ny kurs (bör vara typ Ändra kurs).

*/

import { zodResolver } from "@hookform/resolvers/zod";
import { EditIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
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
      description: course.description,
      // maxbookings: course.maxBookings,
      minAge: course.minAge,
      maxAge: course.maxAge,
      level: course.level ?? "",
      adult: course.adult,
      teacherid: course.teacherId,
      // maxCustomers: course.maxBookings,
    },
  });

  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    form.reset({
      name: course.name,
      description: course.description,
      minAge: course.minAge,
      maxAge: course.maxAge,
      level: course.level ?? "",
      adult: course.adult,
      teacherid: course.teacherId,
    });
  }, [
    isOpen,
    form,
    course.name,
    course.description,
    course.minAge,
    course.maxAge,
    course.level,
    course.adult,
    course.teacherId,
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

  return (
    <Dialog open={isOpen} onOpenChange={(e) => setIsOpen(e)}>
      <DialogTrigger asChild>
        <Button variant={"default"} className="cursor-pointer">
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
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-2 p-2 rounded-xl"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Namn</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beskrivning av kursen</FormLabel>

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
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nivå:</FormLabel>

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

                <Button type="submit" className="w-full">
                  Ändra
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Avbryt
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
