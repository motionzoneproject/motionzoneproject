"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { delEvent } from "@/lib/actions/admin";

interface Props {
  eventId: string;
  imageURL: string;
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

export default function DelEventBtn({ eventId, imageURL }: Props) {
  const router = useRouter();

  const delItm = async () => {
    try {
      const { success, msg } = await delEvent(eventId);
      if (!success) {
        toast.error(`Failed to delete article: ${msg}`);
        console.log(msg);
        return;
      }

      if (imageURL) {
        try {
          const response = await fetch("/api/remove", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: imageURL }),
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data?.error || "Remove failed");
          toast("Gammal bild borttagen");
        } catch (err) {
          toast(String(err));
        }
      }

      toast.success(msg);
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error(
        `Kunde inte ta bort event ${eventId}. Anledning: ${JSON.stringify(e)}`,
      );
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          className="h-8 w-8 p-0 text-white hover:text-white"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Ta bort event</span>
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
