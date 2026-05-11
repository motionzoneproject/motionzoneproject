"use client";

import { Calendar1Icon } from "lucide-react";
import { type ReactNode, useId } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Termin } from "@/generated/prisma/client";

interface Props {
  termin: Termin;
  lang: "sv" | "en";
  children: ReactNode;
}

export function TerminScheduleDialogUI({ termin, lang, children }: Props) {
  const id = useId();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="cursor-pointer">
          <Calendar1Icon className="h-4 w-4" />
          <span className="sr-only">Visa veckoschema</span>
        </Button>
      </DialogTrigger>
      <DialogContent id={id} className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {lang === "en" ? termin.name_en : termin.name}
            <br />
            veckoschema
          </DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
