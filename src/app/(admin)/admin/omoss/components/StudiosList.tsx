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
import type { Studio } from "@/generated/prisma/client";
import { deleteStudio } from "@/lib/actions/studio-actions";
import { StudioForm } from "./StudioForm";

type StudiosListProps = {
  studios: Studio[];
  lang?: "sv" | "en";
};

export function StudiosList({ studios, lang }: StudiosListProps) {
  const router = useRouter();
  const [editingStudio, setEditingStudio] = useState<Studio | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm("Är du säker på att du vill ta bort denna studio?")) return;

    const res = await deleteStudio(id);
    if (res.success) {
      toast.success(res.msg);
      router.refresh();
    } else {
      toast.error(res.msg);
    }
  };

  const openEdit = (studio: Studio) => {
    setEditingStudio(studio);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setEditingStudio(null);
    router.refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-2xl">Studios</span>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="cursor-pointer"
              onClick={() => setEditingStudio(null)}
            >
              <Plus className="h-4 w-4" />
              Lägg till studio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingStudio ? "Redigera studio" : "Lägg till studio"}
              </DialogTitle>
            </DialogHeader>
            <StudioForm
              studio={editingStudio ?? undefined}
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
            {studios.map((studio) => (
              <TableRow key={studio.id}>
                <TableCell className="font-medium">
                  {lang === "en" ? studio.name_en : studio.name}
                </TableCell>
                <TableCell>
                  {studio.active ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(studio)}
                  >
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Redigera studio</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(studio.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Ta bort studio</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {studios.length === 0 && (
          <div className="text-sm text-muted-foreground p-2 italic">
            Inga studios hittades.
          </div>
        )}
      </div>
    </div>
  );
}
