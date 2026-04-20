"use client";

// ev fix: Gör en generisk ta bort-knapp och passa funktionen som den ska köra.

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  type ProdCourse,
  removeCourseInProduct,
} from "@/lib/actions/admin-products";

interface Props {
  pc: ProdCourse;
}

import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DeleteCourseFromProdBtn({ pc }: Props) {
  const router = useRouter();

  const delItm = async () => {
    try {
      const { success, msg } = await removeCourseInProduct(pc);
      if (!success) {
        toast.error(`Kunde inte ta bort kursen: ${msg}`);

        return;
      }
      toast.success(msg);
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error("Kunde inte ta bort kursen.");
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Ta bort kurs från produkt</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[90dvh] overflow-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Är du säker?</AlertDialogTitle>
          <AlertDialogDescription>Kan ej ångras.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async () => await delItm()}
          >
            Ta bort
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
