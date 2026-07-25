"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DialogDescription } from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  Pencil,
  Plus,
  Save,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import LanguageSwitcherInput from "@/components/LanguageSwitcherInput";
import { Button } from "@/components/ui/button";
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
import type { Category } from "@/generated/prisma/client";
import {
  addCategory,
  deleteCategory,
  editCategory,
  getCategoryProductCount,
} from "@/lib/actions/category-actions";
import { adminCategorySchema } from "@/validations/adminforms";

const formSchema = adminCategorySchema;
type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

interface Props {
  categories: Category[];
}

export default function ManageCategoriesDialog({ categories }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formLang, setFormLang] = useState<"sv" | "en">("sv");

  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
    productCount: number;
  } | null>(null);

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", name_en: "" },
  });

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    form.reset({ name: category.name, name_en: category.name_en ?? "" });
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    form.reset({ name: "", name_en: "" });
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const res = editingCategory
      ? await editCategory(editingCategory.id, values)
      : await addCategory(values);

    if (res.success) {
      toast.success(res.msg);
      cancelEdit();
      router.refresh();
    } else {
      const field = res.field ?? "name";
      form.setError(field, {
        type: "manual",
        message: res.msg,
      });
      // Byt till rätt språkläge så felet syns direkt utan att användaren behöver klicka runt.
      if (field === "name_en") setFormLang("en");
      if (field === "name") setFormLang("sv");
      toast.error(res.msg);
    }
  }

  async function requestDelete(category: Category) {
    const productCount = await getCategoryProductCount(category.id);
    setPendingDelete({ id: category.id, name: category.name, productCount });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;

    const res = await deleteCategory(pendingDelete.id);
    if (res.success) {
      toast.success(res.msg);
      if (editingCategory?.id === pendingDelete.id) cancelEdit();
      router.refresh();
    } else {
      toast.error(res.msg);
    }
    setPendingDelete(null);
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          cancelEdit();
          setPendingDelete(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="mr-1 h-4 w-4" />
          Hantera kategorier
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Kategorier</DialogTitle>
          <DialogDescription>
            Lägg till, ändra eller ta bort kategorier för produkter.
          </DialogDescription>
        </DialogHeader>

        {pendingDelete ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">
                  Ta bort kategorin "{pendingDelete.name}"?
                </p>
                {pendingDelete.productCount > 0 ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    {pendingDelete.productCount}{" "}
                    {pendingDelete.productCount === 1
                      ? "produkt använder"
                      : "produkter använder"}{" "}
                    denna kategori. De kommer inte tas bort, men förlorar sin
                    kategori-koppling.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    Ingen produkt använder denna kategori.
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPendingDelete(null)}
              >
                Avbryt
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmDelete}
              >
                Ta bort ändå
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Inga kategorier ännu.
                </p>
              )}
              {categories.map((category) => {
                const isBeingEdited = editingCategory?.id === category.id;
                return (
                  <div
                    key={category.id}
                    className={`flex items-center justify-between gap-2 rounded-lg border p-2 transition-colors ${
                      isBeingEdited
                        ? "border-brand bg-brand/5 ring-1 ring-brand/40"
                        : ""
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{category.name}</p>
                        {isBeingEdited && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-brand bg-brand/10 px-1.5 py-0.5 rounded">
                            Redigerar
                          </span>
                        )}
                      </div>
                      {category.name_en && (
                        <p className="text-xs text-muted-foreground">
                          EN: {category.name_en}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => requestDelete(category)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={`rounded-lg border-t pt-4 mt-2`}>
              {editingCategory && (
                <div className="flex items-center justify-between mb-3 rounded-md bg-brand/10 border border-brand/30 px-3 py-2">
                  <p className="text-sm font-medium text-brand">
                    Redigerar "{editingCategory.name}"
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={cancelEdit}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Avbryt
                  </Button>
                </div>
              )}

              <div className="text-sm my-2">
                Formulärspråk:{" "}
                <LanguageSwitcherInput
                  value={formLang}
                  setValue={(e) => setFormLang(e === "en" ? "en" : "sv")}
                />
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-2"
                >
                  <FormField
                    control={form.control}
                    name={formLang === "en" ? "name_en" : "name"}
                    key={`name-${formLang}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Namn ({formLang})</FormLabel>
                        <FormControl>
                          <Input placeholder="T.ex. Balett" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button type="submit" variant="ghost" className="flex-1">
                      {editingCategory ? (
                        <>
                          <Save className="h-4 w-4" />
                          Spara ändring
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Lägg till
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </>
        )}

        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              <X className="h-4 w-4" />
              Stäng
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
