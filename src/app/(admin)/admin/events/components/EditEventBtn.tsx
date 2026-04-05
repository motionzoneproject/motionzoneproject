"use client";

import { EditIcon } from "lucide-react";
import { useState } from "react";
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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="cursor-pointer">
          <EditIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Redigera event</DialogTitle>
          <DialogDescription>
            Fyll i formuläret för att redigera eventet
          </DialogDescription>
        </DialogHeader>
        <EditEventForm
          event={event}
          isOpen={isOpen}
          onSuccess={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
