"use client";

/// JAG HÅLLER PÅ MED DETTA FORMULÄR SNART KLAR. fix.

import { zodResolver } from "@hookform/resolvers/zod";
import { DialogDescription } from "@radix-ui/react-dialog";
import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import type { Course } from "@/generated/prisma/client";
import {
  addCourseToProduct,
  isCourseInProduct,
  type ProdCourse,
} from "@/lib/actions/admin";
import { getCourseName } from "@/lib/tools";
import { AdminProductCourseItemSchema } from "@/validations/adminforms";
import DeleteCourseFromProdBtn from "./DelCourseFromProdBtn";

const formSchema = AdminProductCourseItemSchema;

type CourseFormInput = z.input<typeof formSchema>;
type CourseFormOutput = z.output<typeof formSchema>;

interface Props {
  productId: string;
  useTotalCount: boolean;
  productCourses: ProdCourse[];
  allCourses: Course[];
}

export default function AddCoursesToProductForm({
  productId,
  useTotalCount,
  productCourses,
  allCourses,
}: Props) {
  const form = useForm<CourseFormInput, unknown, CourseFormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      // courses: [], // Ifall vi ska ha ett och samma formulär sen.
      productId: productId,
      lessonsIncluded: 0,
      courseId: "",
    },
  });

  const router = useRouter();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selCourse, setSelCourse] = useState<string>("");
  const [isInProd, setIsInProd] = useState<boolean | number>();

  useEffect(() => {
    const checkIsInProd = async () => {
      const inProd = await isCourseInProduct(selCourse, productId);
      setIsInProd(inProd.found);
      if (inProd.found) {
        form.setValue("lessonsIncluded", inProd.lessonsIncluded);
      } else {
        form.setValue("lessonsIncluded", 0);
      }
    };
    checkIsInProd();
  }, [selCourse, productId, form.setValue]);

  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen, form]);

  //   const isPC = async (courseId: string): Promise<boolean> => {
  //     const isIt = await isCourseInProduct(courseId, productId);
  //     return isIt;
  //   };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const res = await addCourseToProduct(values);
    if (res.success) {
      toast.success(res.msg);
      //   setIsOpen(false);
      router.refresh();
    } else {
      toast.error(res.msg);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(e) => setIsOpen(e)}>
      <DialogTrigger asChild>
        <Button variant={"default"} className="cursor-pointer">
          Hantera kurser i produkten
        </Button>
      </DialogTrigger>

      <DialogContent className="overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Lägg till kurser i produkt</DialogTitle>
          <DialogDescription>
            Lägg in de kurser som skall kunna bokas med produkten, samt hur
            många bokningar som kan göras.
            {useTotalCount && (
              <span>
                <Info />
                Denna produkt är ett klippkort, så inga separata
                bokningstillfällen ges, utan dessa kurser är vad kunden kan
                välja mellan.
              </span>
            )}
          </DialogDescription>
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
                  name="productId"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormLabel></FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Välj kurs:</FormLabel>

                      <FormControl>
                        <Select
                          defaultValue={field.value || ""}
                          onValueChange={async (value) => {
                            setSelCourse(value);
                            field.onChange(
                              value === "none" ? undefined : value,
                            ); // kan ju ha med none ifall vi vill kunna göra så, why not. Dock är detta req så nja.
                          }}
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
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lessonsIncluded"
                  render={({ field }) => (
                    <FormItem className={useTotalCount ? "hidden" : ""}>
                      <FormLabel>Antal tillfällen:</FormLabel>

                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          disabled={useTotalCount}
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

                <Button type="submit" className="w-full">
                  {isInProd ? "Ändra" : "Lägg till"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <span className="font-bold">Kurser i produkten:</span>
            {productCourses.map((pc) => (
              <div
                key={pc.courseId}
                className="w-full p-2 flex justify-between"
              >
                <div>
                  {getCourseName(pc.course)}
                  {!useTotalCount && (
                    <span>Antal tillfällen: {pc.lessonsIncluded}</span>
                  )}
                </div>
                <div>
                  <DeleteCourseFromProdBtn pc={pc} />
                </div>
              </div>
            ))}
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
