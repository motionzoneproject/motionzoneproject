"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { delTermin } from "@/lib/actions/admin";

interface Props {
  terminId: string;
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

export default function DeleteTerminBtn({ terminId }: Props) {
  const router = useRouter();

  const delItm = async (formData: FormData) => {
    const id = formData.get("id") as string;
    if (!id) return;

    try {
      const { success, msg } = await delTermin(id);
      if (!success) {
        toast.error(`Failed to delete article: ${msg}`);
        console.log(msg);
        return;
      }
      toast.success(msg);
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error(
        `Kunde inte ta bort termin ${terminId}. Anledning: ${JSON.stringify(e)}`,
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
              value={terminId}
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
