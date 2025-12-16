"use client";

// ev fix: Gör en generisk ta bort-knapp och passa funktionen som den ska köra.

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { delSchemaItem } from "@/lib/actions/admin";

interface Props {
  itemId: string;
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

export default function DeleteSchemaItemBtn({ itemId }: Props) {
  const router = useRouter();

  const delItm = async () => {
    try {
      const { success, msg } = await delSchemaItem(itemId);
      if (!success) {
        toast.error(
          `Kunde inte ta bort tillfället med id ${itemId}. Anledning: ${JSON.stringify(
            msg,
          )}`,
        );

        return;
      }
      toast.success(msg);
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error(
        `Kunde inte ta bort tillfället med id ${itemId}. Anledning: ${JSON.stringify(
          e,
        )}`,
      );
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={"destructive"} className="cursor-pointer">
          Ta bort
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
