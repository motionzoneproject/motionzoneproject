"use client";

import { Check, Edit, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Style } from "@/generated/prisma/client";
import { deleteStyle } from "@/lib/actions/style-actions";
import { StylesForm } from "./StylesForm";

type StyleListProps = {
  styles: Style[];
  lang?: string;
};

export function StyleList({ styles, lang }: StyleListProps) {
  const router = useRouter();
  const [editingStyle, setEditingStyle] = useState<Style | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm("Är du säker på att du vill ta bort denna dansstil?")) return;

    const res = await deleteStyle(id);
    if (res.success) {
      toast.success(res.msg);
      router.refresh();
    } else {
      toast.error(res.msg);
    }
  };

  const openEdit = (style: Style) => {
    setEditingStyle(style);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setEditingStyle(null);
    router.refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-2xl">Dansstilar</span>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="cursor-pointer"
              onClick={() => setEditingStyle(null)}
            >
              <Plus className="h-4 w-4" />
              Lägg till dansstil
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingStyle ? "Redigera dansstil" : "Lägg till dansstil"}
              </DialogTitle>
            </DialogHeader>
            <StylesForm
              style={editingStyle ?? undefined}
              onSuccess={handleSuccess}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-2">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>Namn</TableHead>
              <TableHead>Visa</TableHead>
              <TableHead className="text-right">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {styles.map((style) => (
              <TableRow key={style.id}>
                <TableCell className="font-medium">
                  {lang === "en" ? style.name2 : style.name}
                </TableCell>
                <TableCell>
                  {style.active ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(style)}
                  >
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Redigera dansstil</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(style.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Ta bort dansstil</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {styles.length === 0 && (
          <div className="text-sm text-muted-foreground p-2 italic">
            Inga dansstilar hittades.
          </div>
        )}
      </div>
    </div>
  );
}
