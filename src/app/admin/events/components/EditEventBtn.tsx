import { MinusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Event } from "@/generated/prisma/client";
import EditEventForm from "./EditEventForm";

interface Props {
  event: Event;
}

export default function EditEventBtn({ event }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default" className="cursor-pointer">
          <MinusIcon /> Ändra event
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redigera event</DialogTitle>
          <DialogDescription>
            Fyll i formuläret för att redigera eventet
          </DialogDescription>
        </DialogHeader>
        <EditEventForm event={event} />
      </DialogContent>
    </Dialog>
  );
}
