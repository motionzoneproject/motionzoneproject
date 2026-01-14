"use client";

/// JAG HÅLLER PÅ MED DETTA FORMULÄR SNART KLAR. fix.

import { zodResolver } from "@hookform/resolvers/zod";
import { DialogDescription } from "@radix-ui/react-dialog";
import { Info, Pencil } from "lucide-react";
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
  productName: string;
  isClip: boolean;
  productCourses: ProdCourse[];
  allCourses: Course[];
}

export default function AddCoursesToProductForm({
  productId,
  productName,
  isClip,
  productCourses,
  allCourses,
}: Props) {
  const form = useForm<CourseFormInput, unknown, CourseFormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: productId,
      lessonsIncluded: 0,
      unlimited: false,
      courseId: "",
    },
  });

  const router = useRouter();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selCourse, setSelCourse] = useState<string>("");
  const [isInProd, setIsInProd] = useState<boolean | number>();

  useEffect(() => {
    const targetId = sessionStorage.getItem("openCoursesFor");
    if (targetId && targetId === productId) {
      setIsOpen(true);
      sessionStorage.removeItem("openCoursesFor");
    }
  }, [productId]);

  useEffect(() => {
    if (!isOpen) return;
    const toastIdRaw = sessionStorage.getItem("openCoursesToastId");
    if (!toastIdRaw) return;
    const toastId = Number(toastIdRaw);
    toast.dismiss(Number.isNaN(toastId) ? toastIdRaw : toastId);
    sessionStorage.removeItem("openCoursesToastId");
  }, [isOpen]);

  useEffect(() => {
    const checkIsInProd = async () => {
      const inProd = await isCourseInProduct(selCourse, productId);
      setIsInProd(inProd.found);

      if (inProd.found) {
        form.setValue("lessonsIncluded", inProd.lessonsIncluded);
        form.setValue("unlimited", inProd.unlimited);
      } else {
        form.setValue("lessonsIncluded", 0);
        form.setValue("unlimited", false);
      }
    };
    checkIsInProd();
  }, [selCourse, productId, form.setValue]);

  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen, form]);

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
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Hantera kurser i produkten</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Lägg till kurser i {productName}</DialogTitle>
          <DialogDescription>
            Lägg in de kurser som skall kunna bokas med produkten, samt hur
            många bokningar som kan göras.
            {isClip && (
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
                            );
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

                {!isClip && (
                  <FormField
                    control={form.control}
                    name="unlimited"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Obegränsat</FormLabel>

                        <FormControl>
                          <Checkbox
                            checked={field.value as boolean}
                            onCheckedChange={(checked: boolean) => {
                              field.onChange(checked);
                              form.setValue("lessonsIncluded", 0);
                            }}
                            className="w-6 h-6"
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {!isClip && form.watch("unlimited") !== true && (
                  <FormField
                    control={form.control}
                    name="lessonsIncluded"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Antal tillfällen:</FormLabel>

                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            {...field}
                            value={
                              field.value === undefined
                                ? ""
                                : String(field.value)
                            }
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <Button type="submit" variant={"secondary"} className="w-full">
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
                <div className="p-1 border rounded w-full">
                  {getCourseName(pc.course)}
                  <br />
                  {!isClip && (
                    <span>
                      Antal tillfällen:{" "}
                      {pc.unlimited ? "Obegränsat" : pc.lessonsIncluded}
                    </span>
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
