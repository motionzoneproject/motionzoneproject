"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { delSchemaItem } from "@/lib/actions/admin";

interface Props {
  itemId: string;
}

import { toast } from "sonner";
import {
  AlertDialog,
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

  const delItm = async (formData: FormData) => {
    const id = formData.get("id") as string;
    if (!id) return;

    try {
      const { success, msg } = await delSchemaItem(id);
      if (!success) {
        toast.error(
          `Kunde inte ta bort tillfället med id ${id}. Anledning: ${JSON.stringify(
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
        `Kunde inte ta bort tillfället med id ${id}. Anledning: ${JSON.stringify(
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
          <form action={delItm}>
            <input
              type="hidden"
              name="id"
              value={itemId}
              className="cursor-pointer"
            />
            <Button variant={"destructive"} type="submit">
              Ta bort
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
