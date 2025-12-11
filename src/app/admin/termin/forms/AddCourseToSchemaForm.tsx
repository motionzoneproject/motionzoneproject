"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { adminAddCourseToSchemaSchema } from "@/validations/adminforms";

const formSchema = adminAddCourseToSchemaSchema;
type FormValues = z.infer<typeof adminAddCourseToSchemaSchema>;

interface Props {
  termin: Termin;
  allCourses: Course[];
  weekdays: string[];
}

export default function AddCourseToSchemaForm({
  termin,
  allCourses,
  weekdays,
}: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      courseId: "",
      day: "MONDAY",
      timeStart: "0",
      timeEnd: "1",
    },
  });

  const router = useRouter();

  async function onSubmit(values: FormValues) {
    const res = await addCoursetoSchema(termin.id, values);
    alert(JSON.stringify(res));
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nytt kurstillfälle i {termin.name}.</CardTitle>
        <CardDescription></CardDescription>
      </CardHeader>
      <CardContent>
        <br />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Välj kurs" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Välj kurs</SelectLabel>
                        {allCourses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.id} - {c.name}
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
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Välj kurs" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Välj dag</SelectLabel>
                        {weekdays.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
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

            <Button type="submit">Lägg till!</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
