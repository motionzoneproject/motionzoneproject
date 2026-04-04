"use client";

import { MailsIcon } from "lucide-react";
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
import type { SelectedStudent } from "./studentSelection";

interface Props {
  selectedStudents: SelectedStudent[];
}

export function MailDialog({ selectedStudents }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={selectedStudents.length === 0}
        >
          <MailsIcon /> Maila markerade
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            <MailsIcon />
            Mailutskick
          </DialogTitle>
          <DialogDescription>
            {selectedStudents.length} mottagare är valda för utskicket.
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">
          Formuläret för utskicket lägger vi in härnäst.
        </div>
        <DialogFooter>
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
