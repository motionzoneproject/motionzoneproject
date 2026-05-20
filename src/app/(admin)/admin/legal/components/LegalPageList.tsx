"use client";

import { Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LegalPage } from "@/generated/prisma/client";
import { formatDateToInputStr } from "@/lib/date-utils";
import { LegalPageForm } from "./LegalPageForm";

type LegalPageListProps = {
  pages: LegalPage[];
  lang?: "sv" | "en";
};

export function LegalPageList({ pages, lang }: LegalPageListProps) {
  const router = useRouter();
  const [editingPage, setEditingPage] = useState<LegalPage | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const openEdit = (page: LegalPage) => {
    setEditingPage(page);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setEditingPage(null);
    router.refresh();
  };

  return (
    <div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Redigera {editingPage?.title ?? "sida"}</DialogTitle>
          </DialogHeader>
          {editingPage && (
            <LegalPageForm page={editingPage} onSuccess={handleSuccess} />
          )}
        </DialogContent>
      </Dialog>

      <Table className="min-w-[720px]">
        <TableHeader>
          <TableRow>
            <TableHead>Titel</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Senast uppdaterad</TableHead>
            <TableHead className="text-right">Åtgärder</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pages.map((page) => (
            <TableRow key={page.id}>
              <TableCell className="font-medium">
                {lang === "en" ? page.title_en : page.title}
              </TableCell>
              <TableCell className="text-muted-foreground">
                /{page.slug}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDateToInputStr(new Date(page.updatedAt))}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(page)}
                >
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Redigera {page.title}</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pages.length === 0 && (
        <div className="text-sm text-muted-foreground p-2 italic">
          Inga juridiska sidor hittades. Kör seed-skriptet för att skapa dem.
        </div>
      )}
    </div>
  );
}
