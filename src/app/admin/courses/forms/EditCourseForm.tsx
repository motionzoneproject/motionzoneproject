"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Flag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import type { Course } from "@/generated/prisma/client";
import { adminAddCourseSchema } from "@/validations/adminforms";

const formSchema = adminAddCourseSchema;

type CourseFormInput = z.input<typeof adminAddCourseSchema>;
type CourseFormOutput = z.output<typeof adminAddCourseSchema>;

interface Props {
  course: Course;
}

export default function EditCourseForm({ course }: Props) {
  const form = useForm<CourseFormInput, unknown, CourseFormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: course.name,
      description: course.description,
      maxbookings: course.maxBookings,
      minAge: course.minAge,
      maxAge: course.maxAge,
      level: course.level ?? "",
      adult: course.adult,
      teacherid: course.teacherId, // fix: gör så man kan välja lärare.
    },
  });

  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (
      // fix: se över detta, kanske räcker med zod när vi fixat det.
      (form.watch("maxbookings") as number) <= 0 ||
      (form.watch("maxbookings") as string).trim()
    ) {
      values.maxbookings = 0;
    }

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

  const maxBookValue = form.watch("maxbookings");
  const maxBookTrim: string = String(maxBookValue ?? "").trim();

  return (
    <Dialog open={isOpen} onOpenChange={(e) => setIsOpen(e)}>
      <DialogTrigger asChild>
        <Button variant={"default"} className="bg-green-500 cursor-pointer">
          Ändra kursen
        </Button>
      </DialogTrigger>

      <DialogContent className="overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Skapa en ny kurs</DialogTitle>

          <div className="w-full flex items-end bg-amber-200 text-black p-2 rounded">
            <Flag className="w-16 h-16 text-red-600" />{" "}
            <div className="font-bold">
              Du sätts som lärare automatiskt, så om du inte är läraren vänligen
              logga in som rätt lärare och skapa kursen.
            </div>
          </div>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle>Skapa ny kurs.</CardTitle>
          </CardHeader>
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
                  name="maxbookings"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Max bokningar per tillfälle
                        {((form.watch("maxbookings") as number) <= 0 ||
                          maxBookTrim === "") && (
                          <div className="text-yellow-800">
                            (ingen gräns är satt)
                          </div>
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
                    <FormItem className="hidden">
                      <FormLabel>Lärare:</FormLabel>

                      <FormControl>
                        <Input {...field} readOnly />
                      </FormControl>

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
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
