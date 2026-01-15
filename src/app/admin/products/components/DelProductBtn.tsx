"use client";

// ev fix: Gör en generisk ta bort-knapp och passa funktionen som den ska köra.

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { removeProduct } from "@/lib/actions/admin";

interface Props {
  productId: string;
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

export default function DeleteProductBtn({ productId }: Props) {
  const router = useRouter();

  // Bekräfta och uppdatera listan direkt efter borttagning.
  const delItm = async () => {
    try {
      const { success, msg } = await removeProduct(productId);
      if (!success) {
        toast.error(
          `Kunde inte ta bort kursen. Anledning: ${JSON.stringify(msg)}`,
        );

        return;
      }
      toast.success(msg);
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error(`Kunde inte ta bort kursen. Anledning: ${JSON.stringify(e)}`);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Ta bort produkt</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Är du säker?</AlertDialogTitle>
          <AlertDialogDescription>Kan ej ångras.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction onClick={async () => await delItm()}>
            Ta bort
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
