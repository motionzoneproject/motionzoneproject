"use client";

import { PlusIcon } from "lucide-react";
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
import NewEventForm from "./NewEventForm";

export function AddEventBtn() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="cursor-pointer">
          <PlusIcon /> Nytt event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lägg till nytt event</DialogTitle>
          <DialogDescription>Fyll i formuläret</DialogDescription>
        </DialogHeader>
        <NewEventForm onSuccess={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
