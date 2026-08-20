"use client";

import { AlertTriangle, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

export default function CancelOrderBtn({
  orderId,
  onCancel,
  className,
}: {
  orderId: string;
  onCancel: (formData: FormData) => void | Promise<void>;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const formData = new FormData();
      formData.set("orderId", orderId);
      await onCancel(formData);
      setIsOpen(false);
      toast.success("Ordern har markerats som avbruten.");
    } catch {
      toast.error("Kunde inte avbryta ordern.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className={cn(
            "h-7 w-full justify-start px-2 text-[11px] gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/20 shadow-none font-normal transition-colors",
            className,
          )}
        >
          <XIcon className="h-3 w-3 shrink-0" />
          <span>Avbryt</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <DialogTitle>Avbryt order</DialogTitle>
          </div>
          <DialogDescription className="pt-2 text-xs leading-relaxed">
            Är du säker på att du vill avbryta ordern?
            <br />
            <br />
            Ordern kommer att flyttas till avbrutna ordrar och kunden notifieras
            om att köpet inte genomförts. Om du behöver ta bort all data
            permanent kan du ta bort ordern helt istället.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="sm:justify-between gap-2 pt-2">
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="sm" className="text-xs">
              Behåll order
            </Button>
          </DialogClose>
          <Button
            type="button"
            size="sm"
            className="text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
            disabled={isCancelling}
            onClick={handleCancel}
          >
            <XIcon className="h-3.5 w-3.5" />
            {isCancelling ? "Avbryter..." : "Avbryt ordern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
