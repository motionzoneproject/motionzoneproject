"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { removeProduct } from "@/lib/actions/admin";

interface Props {
  productId: string;
  imageURL: string | null;
}

import { useState } from "react";
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

export default function DeleteProductBtn({ productId, imageURL }: Props) {
  const router = useRouter();

  const [loader, setLoader] = useState(false);

  const delItm = async () => {
    try {
      setLoader(true);

      const { success, msg } = await removeProduct(productId);
      if (!success) {
        toast.error(
          `Kunde inte ta bort kursen. Anledning: ${JSON.stringify(msg)}`,
        );
        setLoader(false);
        return;
      }

      if (imageURL) {
        // Ta bort gamla bilden.
        try {
          const res = await fetch("/api/remove", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: imageURL }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || "Remove failed");
          console.log(JSON.stringify(data));
          toast("Gammal bild borttagen");
        } catch (err) {
          toast(String(err));
        }
      }

      toast.success(msg);
      setLoader(false);
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error(`Kunde inte ta bort kursen. Anledning: ${JSON.stringify(e)}`);
      setLoader(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          disabled={loader}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Ta bort produkt</span>
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
            onClick={async () => await delItm()}
            disabled={loader}
          >
            Ta bort
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
