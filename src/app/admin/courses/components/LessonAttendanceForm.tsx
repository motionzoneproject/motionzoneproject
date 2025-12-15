"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

import type { LessonWithBookings } from "@/lib/actions/admin";

interface Props {
  lesson: LessonWithBookings;
}

export default function LessonAttendanceForm({ lesson }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  //   const router = useRouter();

  return (
    <Dialog open={isOpen} onOpenChange={(e) => setIsOpen(e)}>
      <DialogTrigger asChild>
        <Button
          variant={"default"}
          className="bg-green-500 cursor-pointer mb-3"
          disabled={lesson.cancelled}
        >
          Närvaro
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redigera närvaron för tillfället:</DialogTitle>
          <DialogDescription>
            Ange vilken veckodag samt mellan vilka tider du vill lägga in
            tillfället. Tillfället blir då{" "}
            <span className="bold">bokningsbart</span> av kunder som köpt
            tillgång till kursen.
          </DialogDescription>
        </DialogHeader>
        <Card>
          {lesson.bookings.map((b) => (
            <div key={b.id}>{b.userId}</div>
          ))}
        </Card>
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Klar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
