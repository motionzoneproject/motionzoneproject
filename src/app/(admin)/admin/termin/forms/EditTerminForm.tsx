"use client";

import { Pencil, X } from "lucide-react";
import { useId, useState } from "react";
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
import type { Termin } from "@/generated/prisma/client";
import { EditTerminFormUI } from "./EditTerminFormUI";

interface Props {
  termin: Termin;
  initialLang?: "sv" | "en";
}

export default function EditTerminForm({ termin, initialLang = "sv" }: Props) {
  const id = useId();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={(e) => setIsOpen(e)}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Redigera termin</span>
        </Button>
      </DialogTrigger>

      <DialogContent id={id} className="max-h-[90dvh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Ändra terminen</DialogTitle>
          <DialogDescription>
            Ange terminens namn och vilka datum terminen har.
          </DialogDescription>
        </DialogHeader>

        <EditTerminFormUI
          termin={termin}
          initialLang={initialLang}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
        />

        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              <X className="h-4 w-4" />
              Avbryt
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
