"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  // fix: när profilsidan för elever är gjort, blir det lättare att göra det sista här.

  return (
    <Dialog open={isOpen} onOpenChange={(e) => setIsOpen(e)}>
      <DialogTrigger asChild>
        <Button
          variant={"default"}
          className="bg-green-500 cursor-pointer mb-3"
          // disabled={lesson.cancelled}
        >
          Närvaro
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Närvaro</DialogTitle>
          <DialogDescription>
            Här kan du se, lägga till eller ta bort elever från tillfället.
          </DialogDescription>
        </DialogHeader>
        <Card>
          <CardHeader>
            <CardTitle>Närvaro</CardTitle>
            <CardAction>
              <Button variant={"default"}>Lägg till</Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="w-full flex justify-between">
              <div>Du (lärare)</div>
              <div>
                <Button variant={"destructive"}>X</Button>{" "}
              </div>
            </div>
            {lesson.bookings.map((b) => (
              <div key={b.id} className="w-full flex justify-between">
                <div>{b.userId}</div>
                <div>
                  <Button variant={"destructive"}>X</Button>{" "}
                </div>
              </div>
            ))}
          </CardContent>
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
