// app/courses/components/CoursesInfoDialog.tsx
"use client";

import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CoursesInfoDialogProps {
  intro: string;
}

export function InfoDialog({ intro }: CoursesInfoDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-muted-foreground hover:text-brand"
        >
          <Info className="w-8 h-8 block" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Så funkar köpet</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground whitespace-pre-line">
          {intro}
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Stäng</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
