"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DialogDescription } from "@radix-ui/react-dialog";
import { Info, Pencil, Plus, X } from "lucide-react";
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
  type ProdCourse,
} from "@/lib/actions/admin-products";
import { getCourseName } from "@/lib/tools";
import { AdminProductCourseItemSchema } from "@/validations/adminforms";
import DeleteCourseFromProdBtn from "./DelCourseFromProdBtn";

const formSchema = AdminProductCourseItemSchema;

type CourseFormInput = z.input<typeof formSchema>;
type CourseFormOutput = z.output<typeof formSchema>;

interface Props {
  productId: string;
  isClip: boolean;
  clipCount: number;
  productCourses: ProdCourse[];
  allCourses: Course[];
  count: number;
}

export default function AddCoursesToProductForm({
  productId,
  isClip,
  clipCount,
  productCourses,
  allCourses,
  count,
}: Props) {
  const form = useForm<CourseFormInput, unknown, CourseFormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: productId,
      lessonsIncluded: 1,
      unlimited: false,
      courseId: "",
    },
  });

  const router = useRouter();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selCourse, setSelCourse] = useState<string>("");
  const [isInProd, setIsInProd] = useState<boolean>(false);
  const _isBusy = form.formState.isSubmitting || form.formState.isValidating;

  useEffect(() => {
    if (!selCourse) return;
    const match = productCourses.find((pc) => pc.courseId === selCourse); // Hitta kopplingen.
    setIsInProd(Boolean(match));
    form.setValue("lessonsIncluded", match?.lessonsIncluded ?? 0);
    form.setValue("unlimited", match?.unlimited ?? false);
  }, [selCourse, productCourses, form.setValue]);

  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const payload = {
      ...values,
      lessonsIncluded: values.unlimited ? 0 : values.lessonsIncluded,
    };
    const res = await addCourseToProduct(payload);
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
        <Button variant="ghost" className="gap-1">
          <Pencil className="h-4 w-4" />
          <span className="tabular-nums">({count} st)</span>
          <span className="sr-only">Redigera kurser i produkt</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Lägg till kurser i produkt</DialogTitle>
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
                  name="unlimited"
                  render={({ field }) => (
                    <FormItem className={isClip ? "hidden" : ""}>
                      <FormLabel>Obegränsat antal tillfällen</FormLabel>

                      <FormControl>
                        <Checkbox
                          className="w-8 h-8"
                          checked={field.value === true}
                          onCheckedChange={(checked) =>
                            field.onChange(checked === true)
                          }
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lessonsIncluded"
                  render={({ field }) => (
                    <FormItem
                      className={
                        isClip || form.watch("unlimited") === true
                          ? "hidden "
                          : ""
                      }
                    >
                      <FormLabel>Antal tillfällen:</FormLabel>

                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          disabled={isClip || form.watch("unlimited") === true}
                          {...field}
                          value={
                            form.watch("unlimited") === true
                              ? "0"
                              : field.value === undefined
                                ? ""
                                : String(field.value)
                          }
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isClip && (
                  <div className="text-sm text-muted-foreground">
                    Antal tillfällen: {clipCount} (klippkort)
                  </div>
                )}

                <Button variant="ghost" type="submit" className="w-full">
                  {isInProd ? (
                    <Pencil className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
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
                  {!isClip && (
                    <span>
                      Antal tillfällen:{" "}
                      {pc.unlimited ? "Obegränsat" : pc.lessonsIncluded}
                    </span>
                  )}
                  {isClip && (
                    <span> Antal tillfällen: {clipCount} (klippkort)</span>
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
