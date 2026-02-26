"use client";

import { PlusIcon } from "lucide-react";
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
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="cursor-pointer">
          <PlusIcon /> Nytt event
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lägg till nytt event</DialogTitle>
          <DialogDescription>Fyll i formuläret</DialogDescription>
        </DialogHeader>
        <NewEventForm />
      </DialogContent>
    </Dialog>
  );
}
