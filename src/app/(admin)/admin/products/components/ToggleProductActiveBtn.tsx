"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
import { Button } from "@/components/ui/button";
import { toggleProductActive } from "@/lib/actions/admin";

interface Props {
  productId: string;
  productName: string;
  active: boolean;
}

export default function ToggleProductActiveBtn({
  productId,
  productName,
  active,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        const { success, msg } = await toggleProductActive(productId, !active);
        if (!success) {
          toast.error(msg);
          return;
        }
        toast.success(msg);
        router.refresh();
      } catch (e) {
        console.error(e);
        toast.error("Kunde inte ändra produktstatus.");
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title={active ? "Avaktivera (dölj för kunder)" : "Aktivera"}
        >
          {active ? (
            <EyeOffIcon className="h-4 w-4" />
          ) : (
            <EyeIcon className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="sr-only">
            {active ? "Avaktivera produkt" : "Aktivera produkt"}
          </span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {active
              ? `Avaktivera "${productName}"?`
              : `Aktivera "${productName}"?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {active
              ? "Produkten döljs för kunder och går inte längre att köpa, tills du aktiverar den igen."
              : "Produkten blir synlig och köpbar för kunder igen."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={handleConfirm}>
            {active ? "Avaktivera" : "Aktivera"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
