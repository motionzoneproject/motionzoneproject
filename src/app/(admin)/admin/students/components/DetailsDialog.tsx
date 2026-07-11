import { useState } from "react";
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

interface Props {
  id: string;
  isParticipant: boolean;
}

export function DetailsDialog({ id, isParticipant }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Visa</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] min-w-0 overflow-x-hidden overflow-y-visible sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Visar detaljer</DialogTitle>
          <DialogDescription>
            Här kan du se alla uppgifter som finns sparade för vald elev.
          </DialogDescription>
        </DialogHeader>
        <div className="min-w-0 max-h-[65dvh] overflow-x-hidden overflow-y-auto pt-1 pr-1">
          <ul>
            <li>id: {id}</li>
            <li>isParticipant: {isParticipant ? "true" : "false"}</li>
          </ul>
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Stäng
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
