import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function DeleteOrderBtn({
  orderId,
  onDelete,
}: {
  orderId: string;
  onDelete: (orderId: string) => boolean | Promise<boolean>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Nollställ state när dialogen stängs, så nästa gång startar rent
      setConfirmed(false);
      setIsDeleting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmed || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await onDelete(orderId);
      setIsOpen(false);
      if (res) toast.success("Order borttagen!");
      if (!res) toast.error("Order togs inte bort, något gick fel.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-7 px-2.5 text-xs gap-1 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400 shadow-none"
        >
          <Trash2 className="h-4.5 w-4.5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <DialogTitle>Ta bort order</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Ordern tas bort permanent tillsammans med tillhörande produkter,
            bokningar och statistik – detta går inte att ångra.
            <br />
            <br />
            Om ordern är godkänd förlorar kunden tillgång till sina produkter,
            och bokningar (även gamla) försvinner helt ur systemet, inklusive
            närvarohistorik för admin.
            <br />
            <br />
            Deltagare som skapats i samband med köpet finns kvar för kunden vid
            framtida köp, men blir osökbara i admin om de saknar andra kopplade
            ordrar
            <br />
            <br />
            Obs! Om produkten inte är godkänd eller betald ännu, så kan du även
            ange den som avbruten.
          </DialogDescription>
        </DialogHeader>

        <Label className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3 text-sm cursor-pointer">
          <Checkbox
            checked={confirmed}
            onCheckedChange={(checked) => setConfirmed(checked === true)}
            className="mt-0.5"
          />
          <span>
            Jag förstår att åtgärden är permanent och att all information
            kopplad till ordern försvinner, och vad det innebär.
          </span>
        </Label>

        <DialogFooter className="sm:justify-between gap-2">
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Avbryt
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={!confirmed || isDeleting}
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Tar bort..." : "Ta bort ändå"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
