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
import { cn } from "@/lib/utils";

export default function DeleteOrderBtn({
  orderId,
  onDelete,
  className,
  label,
}: {
  orderId: string;
  onDelete: (orderId: string) => boolean | Promise<boolean>;
  className?: string;
  label?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
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
          className={cn(
            "h-7 w-full justify-start px-2 text-[11px] gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/20 shadow-none font-normal transition-colors",
            className,
          )}
        >
          <Trash2 className="h-3 w-3 shrink-0" />
          <span>{label ?? "Ta bort"}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <DialogTitle>Ta bort order</DialogTitle>
          </div>
          <DialogDescription className="pt-2 text-xs">
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
            ordrar.
            <br />
            <br />
            Obs! Om produkten inte är godkänd eller betald ännu, så kan du även
            ange den som avbruten.
          </DialogDescription>
        </DialogHeader>

        <Label className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/40 p-3 text-xs cursor-pointer">
          <Checkbox
            checked={confirmed}
            onCheckedChange={(checked) => setConfirmed(checked === true)}
            className="mt-0.5"
          />
          <span className="leading-relaxed">
            Jag förstår att åtgärden är permanent och att all information
            kopplad till ordern försvinner.
          </span>
        </Label>

        <DialogFooter className="sm:justify-between gap-2">
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="sm" className="text-xs">
              Avbryt
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="text-xs gap-1.5"
            disabled={!confirmed || isDeleting}
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isDeleting ? "Tar bort..." : "Ta bort ändå"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
